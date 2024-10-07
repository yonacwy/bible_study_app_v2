use std::{cell::RefCell, collections::HashMap, sync::Mutex};

use itertools::Itertools;
use serde::{Deserialize, Serialize};
use tauri::PathResolver;
use serde_with::serde_as;

use crate::{bible::*, notes::*, bible_parsing, utils::Color};


static mut DATA: Option<AppData> = None;
const SAVE_NAME: &str = "save.txt";

pub struct AppData
{
    pub bible: Bible,
    notebook: Mutex<RefCell<Notebook>>,

    view_state_index: Mutex<RefCell<usize>>,
    view_states: Mutex<RefCell<Vec<ViewState>>>,
    
    resolver: PathResolver,
}

#[derive(Serialize, Deserialize)]
struct AppSave
{
    notebook: Notebook,
    view_state_index: usize,
    view_states: Vec<ViewState>
}

impl AppData
{
    pub fn init(bible_text: &str, resolver: PathResolver)
    {
        let file = resolver.resolve_resource(SAVE_NAME)
        .and_then(|path| {
            std::fs::read(path).ok()
        })
        .and_then(|data| {
            String::from_utf8(data).ok()
        });

        let (notebook, mut view_state_index, mut view_states) = match file {
            Some(file) => Self::load(&file),
            None => {
                let notebook = Notebook {
                    highlight_catagories: HashMap::new(),
                    notes: HashMap::new(),
                    favorite_verses: HashMap::new(),
                    section_headings: HashMap::new(),
                    annotations: HashMap::new(),
                };
                
                let view_states = vec![
                    ViewState::Chapter { 
                        chapter: ChapterIndex { 
                            book: 0, 
                            number: 0,
                        },
                        verse_range: None,
                        scroll: 0.0,
                    }
                ];

                (notebook, 0, view_states)
            },
        };

        let bible = bible_parsing::parse_bible(bible_text).unwrap();

        if view_state_index >= view_states.len()
        {
            view_state_index = view_states.len() - 1;
        }

        if let ViewState::Chapter { chapter, scroll: _ , verse_range} = &mut view_states[view_state_index]
        {
            if chapter.book >= bible.books.len() as u32 || 
               chapter.number >= bible.books[chapter.book as usize].chapters.len() as u32 ||
               verse_range.map_or(false, |r| r.end >= bible.books[chapter.book as usize].chapters[chapter.number as usize].verses.len() as u32)
            {
                chapter.book = 0;
                chapter.number = 0;
            }
        }

        unsafe 
        {
            DATA = Some(Self {
                bible,
                notebook: Mutex::new(RefCell::new(notebook)),
                view_state_index: Mutex::new(RefCell::new(view_state_index)),
                view_states: Mutex::new(RefCell::new(view_states)),
                resolver
            })
        }
    }

    pub fn save(&self)
    {
        let view_state_index = self.get_view_state_index();

        let view_states = self.view_states.lock().unwrap().borrow().clone();
        let notebook = self.notebook.lock().unwrap().borrow().clone();

        let save = AppSave {
            notebook,
            view_state_index,
            view_states
        };

        let save_json = serde_json::to_string_pretty(&save).unwrap();
        let path = self.resolver.resolve_resource(SAVE_NAME).expect("Error getting save path");
        std::fs::write(path, save_json).expect("Failed to write to save path");
    }

    fn load(json: &str) -> (Notebook, usize, Vec<ViewState>)
    {
        let save: AppSave = serde_json::from_str(json).unwrap();
        (save.notebook, save.view_state_index, save.view_states)
    }

    pub fn get() -> &'static Self 
    {
        unsafe 
        {
            DATA.as_ref().unwrap()
        }
    }

    pub fn get_view_state_index(&self) -> usize
    {
        *self.view_state_index.lock().unwrap().borrow()
    }

    pub fn set_view_state_index(&self, mut index: usize)
    {
        let length = self.view_states.lock().unwrap().borrow().len();
        if index >= length
        {
            index = length - 1;
        }

        *self.view_state_index.lock().unwrap().borrow_mut() = index;
    }

    pub fn read_view_states<R, F>(&self, mut f: F) -> R
        where F : FnMut(&mut Vec<ViewState>) -> R
    {
        let binding = self.view_states.lock().unwrap();
        let mut view_states = binding.borrow_mut();
        f(&mut view_states)
    }

    pub fn read_notes<F, R>(&self, mut f: F) -> R
        where F : FnMut(&mut Notebook) -> R
    {
        let binding = self.notebook.lock().unwrap();
        let mut notebook = binding.borrow_mut();
        f(&mut notebook)
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum ViewState
{
    Chapter
    {
        chapter: ChapterIndex,
        verse_range: Option<VerseRange>,
        scroll: f32,
    },
    Search
    {
        words: Vec<String>,
        display_index: u32,
        scroll: f32,
    },
}