use serde::{Deserialize, Serialize};
use std::{cell::RefCell, collections::HashMap, sync::Mutex};
use tauri::{path::{BaseDirectory, PathResolver}, Runtime};

use crate::{bible::*, bible_parsing, notes::*, utils::Color};

static mut DATA: Option<AppData> = None;
const SAVE_NAME: &str = "save.txt";

pub struct AppData {
    pub bible: Bible,
    notebook: Mutex<RefCell<Notebook>>,

    view_state_index: Mutex<RefCell<usize>>,
    view_states: Mutex<RefCell<Vec<ViewState>>>,
    editing_note: Mutex<RefCell<Option<String>>>,
}

#[derive(Serialize, Deserialize)]
struct AppSave {
    notebook: Notebook,
    view_state_index: usize,
    view_states: Vec<ViewState>,
    editing_note: Option<String>,
}

impl AppData {
    pub fn init<R>(bible_text: &str, resolver: &PathResolver<R>) 
        where R : Runtime
    {
        let file = resolver
            .resolve(SAVE_NAME, BaseDirectory::Resource).ok()
            .and_then(|path| std::fs::read(path).ok())
            .and_then(|data| String::from_utf8(data).ok());

        let mut save = match file {
            Some(file) => Self::load(&file),
            None => {
                let notebook = Notebook {
                    highlight_catagories: HashMap::new(),
                    notes: HashMap::new(),
                    favorite_verses: HashMap::new(),
                    section_headings: HashMap::new(),
                    annotations: HashMap::new(),
                };

                let view_states = vec![ViewState::Chapter {
                    chapter: ChapterIndex { book: 0, number: 0 },
                    verse_range: None,
                    scroll: 0.0,
                }];

                AppSave {
                    notebook,
                    view_state_index: 0,
                    view_states,
                    editing_note: None,
                }
            }
        };

        let bible = bible_parsing::parse_bible(bible_text).unwrap();

        if save.view_state_index >= save.view_states.len() {
            save.view_state_index = save.view_states.len() - 1;
        }

        if let ViewState::Chapter {
            chapter,
            scroll: _,
            verse_range,
        } = &mut save.view_states[save.view_state_index]
        {
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

        let mut test_notebook = Notebook::default();
        {
            let highlight_id = uuid::Uuid::new_v4().to_string();
            test_notebook.highlight_catagories.insert(
                highlight_id.clone(),
                HighlightCategory {
                    color: Color {
                        r: 255,
                        g: 255,
                        b: 0,
                    },
                    name: "test".into(),
                    description: "this is a test description".into(),
                    priority: 10,
                    id: highlight_id.clone(),
                },
            );

            let mut annotations = HashMap::new();
            annotations.insert(
                0,
                WordAnnotations {
                    highlights: vec![highlight_id.clone()],
                    notes: vec![],
                },
            );
            annotations.insert(
                1,
                WordAnnotations {
                    highlights: vec![highlight_id.clone()],
                    notes: vec![],
                },
            );
            annotations.insert(
                2,
                WordAnnotations {
                    highlights: vec![highlight_id.clone()],
                    notes: vec![],
                },
            );

            annotations.insert(
                4,
                WordAnnotations {
                    highlights: vec![highlight_id.clone()],
                    notes: vec![],
                },
            );

            test_notebook
                .annotations
                .insert(ChapterIndex { book: 0, number: 0 }, annotations);
        }
        test_notebook.add_note(
            &bible,
            "df4163b0-c155-4b3f-9f1b-1ff0ab5f243d".into(),
            "# Here is a test note!".into(),
            vec![
                ReferenceLocation {
                    chapter: ChapterIndex { book: 0, number: 0 },
                    range: WordRange {
                        verse_start: 0,
                        word_start: 0,
                        verse_end: 0,
                        word_end: 3,
                    },
                },
                ReferenceLocation {
                    chapter: ChapterIndex { book: 1, number: 0 },
                    range: WordRange {
                        verse_start: 0,
                        word_start: 0,
                        verse_end: 0,
                        word_end: 3,
                    },
                },
            ],
        );

        unsafe {
            DATA = Some(Self {
                bible,
                notebook: Mutex::new(RefCell::new(test_notebook)),
                view_state_index: Mutex::new(RefCell::new(save.view_state_index)),
                view_states: Mutex::new(RefCell::new(save.view_states)),
                editing_note: Mutex::new(RefCell::new(save.editing_note)),
            })
        }
    }

    pub fn save<R>(&self, resolver: &PathResolver<R>) 
        where R : Runtime
    {
        let view_state_index = self.get_view_state_index();

        let view_states = self.view_states.lock().unwrap().borrow().clone();
        let notebook = self.notebook.lock().unwrap().borrow().clone();
        let editing_note = self.editing_note.lock().unwrap().borrow().clone();

        let save = AppSave {
            notebook,
            view_state_index,
            editing_note,
            view_states,
        };

        let save_json = serde_json::to_string_pretty(&save).unwrap();
        let path = resolver.resolve(SAVE_NAME, BaseDirectory::Resource)
            .expect("Error getting save path");
        std::fs::write(path, save_json).expect("Failed to write to save path");
    }

    fn load(json: &str) -> AppSave 
    {
        serde_json::from_str(json).unwrap()
    }

    pub fn get() -> &'static Self 
    {
        unsafe { DATA.as_ref().unwrap() }
    }

    pub fn get_view_state_index(&self) -> usize 
    {
        *self.view_state_index.lock().unwrap().borrow()
    }

    pub fn set_view_state_index(&self, mut index: usize) 
    {
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

    pub fn read_notes<F, R>(&self, mut f: F) -> R
    where
        F: FnMut(&mut Notebook) -> R,
    {
        let binding = self.notebook.lock().unwrap();
        let mut notebook = binding.borrow_mut();
        f(&mut notebook)
    }

    pub fn read_editing_note<F, R>(&self, mut f: F) -> R
    where
        F: FnMut(&mut Option<String>) -> R,
    {
        let binding = self.editing_note.lock().unwrap();
        let mut editing_note = binding.borrow_mut();
        f(&mut editing_note)
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "type")]
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
    },
}
