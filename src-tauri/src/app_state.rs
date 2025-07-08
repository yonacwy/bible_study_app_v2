use cloud_sync::GoogleUserInfo;
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::{cell::RefCell, collections::HashMap, io::Read, ops::Deref, path::PathBuf, sync::{Arc, Mutex, MutexGuard, RwLock}, thread::spawn};
use tauri::{
    path::{BaseDirectory, PathResolver}, AppHandle, Emitter, Runtime
};

use crate::{
    audio::{reader_behavior::ReaderBehavior, TtsSettings}, bible::*, bible_parsing, cloud_sync::{CloudSyncState, RemoteSave}, debug_release_val, migration::{SaveVersion, CURRENT_SAVE_VERSION}, notes::{action::{Action, ActionHistory, ActionType, NotebookActionHandler}, *}, save_data::{AppSave, LocalDeviceSave, LocalDeviceSaveVersion, NotebookRecordSave, NotebookRecordSaveVersion}, settings::Settings
};

pub const SAVE_NAME: &str = "save.json";

pub const DEFAULT_BIBLE: &str = "KJV";

pub const BIBLE_PATHS: &[&str] = &[
    debug_release_val! { 
        debug: "resources/bibles/small_kjv.txt",
        release: "resources/bibles/kjv.txt",
    },
    debug_release_val! { 
        debug: "resources/bibles/small_asv.txt",
        release: "resources/bibles/asv.txt",
    },
    debug_release_val! { 
        debug: "resources/bibles/small_bbe.txt",
        release: "resources/bibles/bbe.txt",
    },
    debug_release_val! { 
        debug: "resources/bibles/small_ylt.txt",
        release: "resources/bibles/ylt.txt",
    },
    debug_release_val! { 
        debug: "resources/bibles/small_sparv.txt",
        release: "resources/bibles/sparv.txt",
    },
];

/// Is a locking reference to the internal `AppData` of the `AppState`
pub struct AppStateRef<'a>(MutexGuard<'a, Option<AppData>>);

impl<'a> Deref for AppStateRef<'a>
{
    type Target = AppData;

    fn deref(&self) -> &Self::Target 
    {
        self.0.as_ref().unwrap()
    }
}

/// A struct used to send the `AppState` across threads, without locking it. 
#[derive(Clone)]
pub struct AppStateHandle(Arc<Mutex<Option<AppData>>>);

impl AppStateHandle
{
    pub fn get_ref(&self) -> AppStateRef
    {
        AppStateRef(self.0.lock().unwrap())
    }
}

pub struct AppState(Arc<Mutex<Option<AppData>>>);

impl AppState
{
    pub fn create<R>(resolver: &PathResolver<R>, app_handle: AppHandle) -> Self
        where R : Runtime
    {
        let data = Arc::new(Mutex::new(None));

        let builder = AppData::get_builder(resolver, app_handle);

        let cloned = data.clone();
        spawn(move || {
            let built = builder();
            *cloned.lock().unwrap() = Some(built);
        });

        Self(data)
    }

    pub fn get_ref(&self) -> AppStateRef<'_>
    {
        AppStateRef(self.get())
    }

    pub fn get(&self) -> MutexGuard<'_, Option<AppData>>
    {
        self.0.lock().unwrap()
    }

    pub fn get_handle(&self) -> AppStateHandle
    {
        AppStateHandle(self.0.clone())
    }

    pub fn is_initialized(&self) -> bool
    {
        self.0.lock().unwrap().is_some()
    }
}

pub struct AppData {
    bibles: HashMap<String, Arc<Bible>>,
    current_bible_version: Mutex<RefCell<String>>,
    
    pub save_version: SaveVersion,
    
    // The key is the owner id of the user, basically their drive account
    notebook_handlers: RwLock<HashMap<Option<String>, NotebookActionHandler>>,

    view_state_index: Mutex<RefCell<usize>>,
    view_states: Mutex<RefCell<Vec<ViewState>>>,
    editing_note: Mutex<RefCell<Option<String>>>,

    need_display_migration: Mutex<RefCell<bool>>,
    need_display_no_save: Mutex<RefCell<bool>>,
    settings: Mutex<RefCell<Settings>>,

    selected_reading: Mutex<RefCell<u32>>,
    reader_behavior: Mutex<RefCell<ReaderBehavior>>,

    recent_highlights: Mutex<RefCell<Vec<Uuid>>>,

    pub sync_state: RwLock<CloudSyncState>,
}

impl AppData {
    pub fn get_builder<R>(resolver: &PathResolver<R>, app_handle: AppHandle) -> Box<dyn FnOnce() -> Self + Send + Sync + 'static>
    where
        R : Runtime,
    {
        let save_path = resolver
            .resolve(SAVE_NAME, BaseDirectory::Resource)
            .ok();

        let bible_paths = Self::get_bible_paths(resolver);

        Box::new(|| Self::new(save_path, bible_paths, app_handle))
    }

    fn new(save_path: Option<PathBuf>, bible_paths: Vec<PathBuf>, app_handle: AppHandle) -> Self
    {
        let file = save_path
            .and_then(|path| std::fs::read(path).ok())
            .and_then(|data| String::from_utf8(data).ok());

        let bibles = Self::load_bibles(&bible_paths);

        let (mut save, was_migrated, no_save) = match file {
            Some(file) => {
                let (save, migrated) = AppSave::load(&file);
                app_handle.emit("loaded-tts-save", save.local_device_save.tts_settings).unwrap();
                (save, migrated, false)
            },
            None => {
                (AppSave::default(), false, true)
            }
        };

        if save.local_device_save.view_state_index >= save.local_device_save.view_states.len() {
            save.local_device_save.view_state_index = save.local_device_save.view_states.len() - 1;
        }

        save.local_device_save.current_bible_version = if bibles.contains_key(&save.local_device_save.current_bible_version)
        {
            save.local_device_save.current_bible_version.clone()
        }
        else 
        {
            DEFAULT_BIBLE.to_owned()
        };

        if let ViewState::Chapter {
            chapter,
            scroll: _,
            verse_range,
        } = &mut save.local_device_save.view_states[save.local_device_save.view_state_index]
        {
            let bible = &bibles.get(&save.local_device_save.current_bible_version).map_or(bibles.get(DEFAULT_BIBLE).unwrap(), |b| b);

            if chapter.book >= bible.books.len() as u32
                || chapter.number >= bible.books[chapter.book as usize].chapters.len() as u32
                || verse_range.map_or(false, |r| {
                    r.end
                        >= bible.books[chapter.book as usize].chapters[chapter.number as usize]
                            .verses
                            .len() as u32
                })
            {
                chapter.book = 0;
                chapter.number = 0;
            }
        }

        let handlers = save.note_record_saves.into_iter().map(|notebook| {
            let action_handler = NotebookActionHandler::new(notebook.history, &bibles);
            (notebook.owner_id, action_handler)
        }).collect::<HashMap<_, _>>();

        Self {
            bibles,
            current_bible_version: Mutex::new(RefCell::new(save.local_device_save.current_bible_version)),
            save_version: CURRENT_SAVE_VERSION,
            notebook_handlers: RwLock::new(handlers),
            view_state_index: Mutex::new(RefCell::new(save.local_device_save.view_state_index)),
            view_states: Mutex::new(RefCell::new(save.local_device_save.view_states)),
            editing_note: Mutex::new(RefCell::new(save.local_device_save.editing_note)),
            need_display_migration: Mutex::new(RefCell::new(was_migrated)),
            need_display_no_save: Mutex::new(RefCell::new(no_save)),
            settings: Mutex::new(RefCell::new(save.local_device_save.settings)),
            selected_reading: Mutex::new(RefCell::new(save.local_device_save.selected_reading)),
            reader_behavior: Mutex::new(RefCell::new(save.local_device_save.reader_behavior)),
            recent_highlights: Mutex::new(RefCell::new(save.local_device_save.recent_highlights)),
            sync_state: RwLock::new(CloudSyncState::from_save(save.local_device_save.cloud_sync_save)), 
        }
    }

    pub fn save<R>(&self, resolver: &PathResolver<R>, tts_settings: TtsSettings)
    where
        R: Runtime,
    {
        let view_state_index = self.get_view_state_index();

        let view_states = self.view_states.lock().unwrap().borrow().clone();
        let mut handlers = self.notebook_handlers.try_write().unwrap();
        let current_bible_version = self.current_bible_version.lock().unwrap().borrow().clone();
        let editing_note = self.editing_note.lock().unwrap().borrow().clone();
        let settings = self.settings.lock().unwrap().borrow().clone();
        let selected_reading = self.selected_reading.lock().unwrap().borrow().clone();
        let reader_behavior = self.reader_behavior.lock().unwrap().borrow().clone();
        let recent_highlights = self.recent_highlights.lock().unwrap().borrow().clone();
        let cloud_sync_save = self.sync_state.try_read().unwrap().get_save();

        let note_record_saves = handlers.iter_mut().map(|(owner, handler)| {
            handler.commit_group();  // make sure we have all actions committed
            NotebookRecordSave {
                history: handler.get_history().clone(),
                save_version: NotebookRecordSaveVersion::CURRENT_SAVE_VERSION,
                owner_id: owner.clone(),
            }
        }).collect_vec();

        let local_device_save = LocalDeviceSave {
            save_version: LocalDeviceSaveVersion::CURRENT_SAVE_VERSION,
            current_bible_version,
            view_state_index,
            view_states,
            editing_note,
            settings,
            selected_reading,
            tts_settings,
            reader_behavior,
            recent_highlights,
            cloud_sync_save,
        };

        let save = AppSave {
            note_record_saves,
            local_device_save,
        };

        let save_json = serde_json::to_string_pretty(&save).unwrap();
        let path = resolver
            .resolve(SAVE_NAME, BaseDirectory::Resource)
            .expect("Error getting save path");
        std::fs::write(path, save_json).expect("Failed to write to save path");
    }

    pub fn get_view_state_index(&self) -> usize {
        *self.view_state_index.lock().unwrap().borrow()
    }

    pub fn set_view_state_index(&self, mut index: usize) {
        let length = self.view_states.lock().unwrap().borrow().len();
        if index >= length {
            index = length - 1;
        }

        *self.view_state_index.lock().unwrap().borrow_mut() = index;
    }

    pub fn read_view_states<R, F>(&self, mut f: F) -> R
    where
        F: FnMut(&mut Vec<ViewState>) -> R,
    {
        let binding = self.view_states.lock().unwrap();
        let mut view_states = binding.borrow_mut();
        f(&mut view_states)
    }

    pub fn get_current_bible_version(&self) -> String
    {
        let binding = self.current_bible_version.lock().unwrap();
        let current_bible = binding.borrow();
        current_bible.clone()
    }

    pub fn get_current_bible(&self) -> &Bible
    {
        let bible_version = self.get_current_bible_version();
        self.bibles.get(&bible_version).map_or(self.bibles.get(DEFAULT_BIBLE).unwrap(), |b| b)
    }

    pub fn get_default_bible(&self) -> Arc<Bible>
    {
        self.bibles.get(DEFAULT_BIBLE).unwrap().clone()
    }

    pub fn get_bible(&self, name: &String) -> Option<Arc<Bible>>
    {
        self.bibles.get(name).map(|b| b.clone())
    }
    
    pub fn set_current_bible_version(&self, version: String)
    {
        if self.get_bibles().find(|v| **v == version).is_some()
        {
            let mut version_binding = self.current_bible_version.lock().unwrap();

            let current_version = version_binding.get_mut();
            // if switching to the same version, don't need to do anything
            if *current_version == version { return; }
            *current_version = version;

            let mut note_binding = self.editing_note.lock().unwrap();
            *note_binding.get_mut() = None; 
        }
    }

    pub fn get_bibles(&self) -> impl Iterator<Item = &String>
    {
        self.bibles.keys().into_iter()
    }

    pub fn read_current_notebook<F, R>(&self, mut f: F) -> R
        where F : FnMut(&Notebook) -> R
    {
        let mut handlers = self.notebook_handlers.try_write().unwrap();
        let owner_id = self.sync_state.try_read().unwrap().get_owner_id();
        let handler = handlers.entry(owner_id).or_insert(NotebookActionHandler::new(ActionHistory::new(), &self.bibles));

        let current_bible_version = self.get_current_bible_version();

        let notebook = handler.get_or_insert_notebook(current_bible_version);
        f(notebook)
    }

    pub fn run_action_on_current_notebook(&self, action_type: ActionType)
    {
        let mut handlers = self.notebook_handlers.try_write().unwrap();
        let owner_id = self.sync_state.try_read().unwrap().get_owner_id();
        let handler = handlers.entry(owner_id).or_insert(NotebookActionHandler::new(ActionHistory::new(), &self.bibles));

        let action = Action {
            notebook: self.get_current_bible_version(),
            bible_name: self.get_current_bible_version(),
            action: action_type,
        };

        handler.push_action(action, &self.bibles);
    }

    pub fn read_editing_note<F, R>(&self, mut f: F) -> R
    where
        F: FnMut(&mut Option<String>) -> R,
    {
        let binding = self.editing_note.lock().unwrap();
        let mut editing_note = binding.borrow_mut();

        // check to see if the editing note exists in this context. It may not exist if the current notebook is changed
        if editing_note.as_ref().is_some_and(|id| !self.read_current_notebook(|notebook| notebook.has_note(&id)))
        {
            *editing_note = None;
        }

        f(&mut editing_note)
    }

    pub fn read_settings<F, R>(&self, mut f: F) -> R 
    where 
        F: FnMut(&mut Settings) -> R 
    {
        let binding = self.settings.lock().unwrap();
        let mut settings = binding.borrow_mut();
        f(&mut settings)
    }

    pub fn read_selected_reading<F, R>(&self, mut f: F) -> R 
        where F: FnMut(&mut u32) -> R
    {
        let binding = self.selected_reading.lock().unwrap();
        let mut selected_reading = binding.borrow_mut();
        f(&mut *selected_reading)
    }

    /// If the application migrated teh save on load, will only return true ONCE, then will always return false
    pub fn should_display_migration(&self) -> bool 
    {
        let binding = self.need_display_migration.lock().unwrap();
        let mut need_display_migration = binding.borrow_mut();
        
        let old = *need_display_migration;
        *need_display_migration = false;
        old
    }

    /// If the application migrated teh save on load, will only return true ONCE, then will always return false
    pub fn should_display_no_save(&self) -> bool 
    {
        let binding = self.need_display_no_save.lock().unwrap();
        let mut need_display_no_save = binding.borrow_mut();
        
        let old = *need_display_no_save;
        *need_display_no_save = false;
        old
    }

    pub fn read_reader_behavior<F, R>(&self, mut f: F) -> R 
        where F: FnMut(&mut ReaderBehavior) -> R
    {
        let binding = self.reader_behavior.lock().unwrap();
        let mut selected_reading = binding.borrow_mut();
        f(&mut *selected_reading)
    }

    pub fn read_recent_highlights<F, R>(&self, mut f: F) -> R 
        where F : FnMut(&mut Vec<Uuid>) -> R
    {
        let binding = self.recent_highlights.lock().unwrap();
        let mut recent_highlights = binding.borrow_mut();
        f(&mut *recent_highlights)
    }

    pub fn get_remote_save(&self) -> RemoteSave
    {
        let mut handlers = self.notebook_handlers.try_write().unwrap();
        let owner_id = self.sync_state.try_read().unwrap().get_owner_id();
        let handler = handlers.entry(owner_id).or_insert(NotebookActionHandler::new(ActionHistory::new(), &self.bibles));

        let note_record_save = NotebookRecordSave {
            history: handler.get_history().clone(),
            save_version: NotebookRecordSaveVersion::CURRENT_SAVE_VERSION,
            owner_id: None,
        };

        RemoteSave { note_record_save }
    }

    pub fn is_signed_in(&self) -> bool
    {
        let sync_state = self.sync_state.try_read().unwrap();
        sync_state.drive_client.is_some()
    }

    pub fn get_user_info(&self) -> Option<GoogleUserInfo>
    {
        let sync_state = self.sync_state.try_read().unwrap();
        sync_state.drive_client.as_ref().map(|c| c.user_info().clone())
    }

    pub fn sync_with_cloud(&self) -> Result<(), String>
    {
        let user_id = self.get_user_info().map(|i| i.sub);

        let remote = self.sync_state.try_read().unwrap().read_remote_save()?;

        let mut handlers = self.notebook_handlers.try_write().unwrap();
        let handler = handlers.entry(user_id.clone()).or_insert(NotebookActionHandler::new(ActionHistory::new(), &self.bibles));
        let local = handler.get_history().clone();
        drop(handlers);

        let merged = match remote
        {
            Some(remote) => ActionHistory::merge(remote.note_record_save.history, local),
            None => local
        };

        let sync_state = self.sync_state.try_read().unwrap();
        let remote_save = RemoteSave { note_record_save: NotebookRecordSave { 
            history: merged, 
            save_version: NotebookRecordSaveVersion::CURRENT_SAVE_VERSION, 
            owner_id: user_id, 
        }};
        
        sync_state.write_remote_save(&remote_save).unwrap();

        Ok(())
    }

    fn get_bible_paths<R>(path_resolver: &PathResolver<R>) -> Vec<PathBuf>
        where R : Runtime
    {
        BIBLE_PATHS.iter().map(|relative_path| {
            path_resolver.resolve(relative_path, BaseDirectory::Resource)
                .expect(&format!("Failed to resolve path `{}`", relative_path))
        }).collect()
    }

    fn load_bibles(paths: &Vec<PathBuf>) -> HashMap<String, Arc<Bible>>
    {
        paths.iter().map(|path| {
            let mut file = std::fs::File::open(&path).unwrap();

            let mut text = String::new();
            file.read_to_string(&mut text).unwrap();
            let bible = bible_parsing::parse_bible(&text).unwrap();
            (bible.name.clone(), Arc::new(bible))
        }).collect::<HashMap<_, _>>()
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "type")]
pub enum ViewState {
    Chapter {
        chapter: ChapterIndex,
        verse_range: Option<VerseRange>,
        scroll: f32,
    },
    Search {
        words: Vec<String>,
        display_index: u32,
        scroll: f32,
        note_editing_location: Option<ReferenceLocation>,
    },
}
