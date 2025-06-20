use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::{cell::RefCell, collections::HashMap, io::Read, ops::Deref, path::PathBuf, sync::{Arc, Mutex, MutexGuard}, thread::spawn};
use tauri::{
    path::{BaseDirectory, PathResolver}, AppHandle, Emitter, Runtime
};

use crate::{
    audio::{reader_behavior::ReaderBehavior, TtsSettings}, bible::*, bible_parsing, debug_release_val, migration::{SaveVersion, CURRENT_SAVE_VERSION}, notes::*, save_data::AppSave, settings::Settings
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

pub struct AppStateRef<'a>(MutexGuard<'a, Option<AppData>>);

impl<'a> Deref for AppStateRef<'a>
{
    type Target = AppData;

    fn deref(&self) -> &Self::Target 
    {
        self.0.as_ref().unwrap()
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

    pub fn is_initialized(&self) -> bool
    {
        self.0.lock().unwrap().is_some()
    }
}

pub struct AppData {
    bibles: HashMap<String, Arc<Bible>>,
    current_bible_version: Mutex<RefCell<String>>,
    
    pub save_version: SaveVersion,
    
    notebooks: Mutex<RefCell<HashMap<String, Notebook>>>,

    view_state_index: Mutex<RefCell<usize>>,
    view_states: Mutex<RefCell<Vec<ViewState>>>,
    editing_note: Mutex<RefCell<Option<String>>>,

    need_display_migration: Mutex<RefCell<bool>>,
    need_display_no_save: Mutex<RefCell<bool>>,
    settings: Mutex<RefCell<Settings>>,

    selected_reading: Mutex<RefCell<u32>>,
    reader_behavior: Mutex<RefCell<ReaderBehavior>>,

    recent_highlights: Mutex<RefCell<Vec<Uuid>>>,
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

        // let (mut save, was_migrated, no_save) = match file {
        //     Some(file) => {
        //         let (save, migrated) = AppSave::load(&file);
        //         app_handle.emit("loaded-tts-save", save.tts_settings).unwrap();
        //         (save, migrated, false)
        //     },
        //     None => {
        //         (AppSave::default(), false, true)
        //     }
        // };

        // if save.view_state_index >= save.view_states.len() {
        //     save.view_state_index = save.view_states.len() - 1;
        // }

        // let current_bible_version = if bibles.contains_key(&save.current_bible_version)
        // {
        //     save.current_bible_version.clone()
        // }
        // else 
        // {
        //     DEFAULT_BIBLE.to_owned()
        // };

        // if let ViewState::Chapter {
        //     chapter,
        //     scroll: _,
        //     verse_range,
        // } = &mut save.view_states[save.view_state_index]
        // {
        //     let bible = &bibles.get(&save.current_bible_version).map_or(bibles.get(DEFAULT_BIBLE).unwrap(), |b| b);

        //     if chapter.book >= bible.books.len() as u32
        //         || chapter.number >= bible.books[chapter.book as usize].chapters.len() as u32
        //         || verse_range.map_or(false, |r| {
        //             r.end
        //                 >= bible.books[chapter.book as usize].chapters[chapter.number as usize]
        //                     .verses
        //                     .len() as u32
        //         })
        //     {
        //         chapter.book = 0;
        //         chapter.number = 0;
        //     }
        // }

        let save = AppSave::default();
        let was_migrated = false;
        let no_save = false;

        let notebooks = save.note_record_save.history.to_save(&bibles).notebooks;

        Self {
            bibles,
            current_bible_version: Mutex::new(RefCell::new(save.local_device_save.current_bible_version)),
            save_version: CURRENT_SAVE_VERSION,
            notebooks: Mutex::new(RefCell::new(notebooks)),
            view_state_index: Mutex::new(RefCell::new(save.local_device_save.view_state_index)),
            view_states: Mutex::new(RefCell::new(save.local_device_save.view_states)),
            editing_note: Mutex::new(RefCell::new(save.local_device_save.editing_note)),
            need_display_migration: Mutex::new(RefCell::new(was_migrated)),
            need_display_no_save: Mutex::new(RefCell::new(no_save)),
            settings: Mutex::new(RefCell::new(save.local_device_save.settings)),
            selected_reading: Mutex::new(RefCell::new(save.local_device_save.selected_reading)),
            reader_behavior: Mutex::new(RefCell::new(save.local_device_save.reader_behavior)),
            recent_highlights: Mutex::new(RefCell::new(save.local_device_save.recent_highlights)),
        }
    }

    pub fn save<R>(&self, resolver: &PathResolver<R>, tts_settings: TtsSettings)
    where
        R: Runtime,
    {
        // let view_state_index = self.get_view_state_index();

        // let view_states = self.view_states.lock().unwrap().borrow().clone();
        // let notebooks = self.notebooks.lock().unwrap().borrow().clone();
        // let current_bible_version = self.current_bible_version.lock().unwrap().borrow().clone();
        // let editing_note = self.editing_note.lock().unwrap().borrow().clone();
        // let settings = self.settings.lock().unwrap().borrow().clone();
        // let save_version = self.save_version;
        // let selected_reading = self.selected_reading.lock().unwrap().borrow().clone();
        // let reader_behavior = self.reader_behavior.lock().unwrap().borrow().clone();
        // let recent_highlights = self.recent_highlights.lock().unwrap().borrow().clone();

        // let save = AppSave {
        //     notebooks,
        //     current_bible_version,
        //     save_version,
        //     view_state_index,
        //     editing_note,
        //     view_states,
        //     settings,
        //     selected_reading,
        //     tts_settings,
        //     reader_behavior,
        //     recent_highlights
        // };

        // let save_json = serde_json::to_string_pretty(&save).unwrap();
        // let path = resolver
        //     .resolve(SAVE_NAME, BaseDirectory::Resource)
        //     .expect("Error getting save path");
        // std::fs::write(path, save_json).expect("Failed to write to save path");

        println!("TODO: Implement saving")
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

    pub fn read_notes<F, R>(&self, mut f: F) -> R
    where
        F: FnMut(&mut Notebook) -> R,
    {
        let binding = self.notebooks.lock().unwrap();
        let mut notebooks = binding.borrow_mut();

        let current_bible_version = self.get_current_bible_version();

        let notebook = notebooks.entry(current_bible_version).or_default();
        f(notebook)
    }

    pub fn read_editing_note<F, R>(&self, mut f: F) -> R
    where
        F: FnMut(&mut Option<String>) -> R,
    {
        let binding = self.editing_note.lock().unwrap();
        let mut editing_note = binding.borrow_mut();
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
