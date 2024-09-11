use std::{cell::RefCell, collections::HashMap, sync::Mutex};

use itertools::Itertools;
use serde::{Deserialize, Serialize};
use tauri::PathResolver;

use crate::{bible::*, notes::*, bible_parsing, utils::Color};


static mut DATA: Option<AppData> = None;
const SAVE_NAME: &str = "save.txt";

pub struct AppData
{
    pub bible: Bible,
    notebook: Mutex<RefCell<Notebook>>,
    current_chapter: Mutex<RefCell<ChapterIndex>>,
    resolver: PathResolver,
}

#[derive(Serialize, Deserialize)]
struct AppSave
{
    highlight_catagories: Vec<(String, HighlightCategory)>,
    chapter_highlights: Vec<(ChapterIndex, Vec<(u32, Vec<String>)>)>,
    current_chapter: ChapterIndex,
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

        let (notebook, mut chapter) = match file {
            Some(file) => Self::load(&file),
            None => {
                let notebook = Notebook {
                    highlight_catagories: HashMap::new(),
                    chapter_highlights: HashMap::new()
                };
                let current_chapter = ChapterIndex {
                    book: 0,
                    number: 0
                };
                (notebook, current_chapter)
            },
        };

        let bible = bible_parsing::parse_bible(bible_text).unwrap();

        if chapter.book >= bible.books.len() as u32 || 
           chapter.number >= bible.books[chapter.book as usize].chapters.len() as u32
        {
            chapter = ChapterIndex {
                book: 0,
                number: 0
            };
        }

        unsafe 
        {
            DATA = Some(Self {
                bible,
                notebook: Mutex::new(RefCell::new(notebook)),
                current_chapter: Mutex::new(RefCell::new(chapter)),
                resolver
            })
        }
    }

    pub fn save(&self)
    {
        let current_chapter = self.get_current_chapter();

        let save = self.read_notes(|notebook| { 

            let highlight_catagories = notebook.highlight_catagories.iter()
                .map(|(id, category)| (id.clone(), category.clone()))
                .collect_vec();

            let chapter_highlights = notebook.chapter_highlights.iter()
                .map(|(index, highlights)| {
                    let highlight_vec = highlights.iter()
                        .map(|(verse, ids)| (*verse, ids.clone()))
                        .collect_vec();

                    (index.clone(), highlight_vec)
                })
                .collect_vec();

            AppSave
            {
                highlight_catagories,
                chapter_highlights,
                current_chapter: current_chapter.clone()
            }
        });

        let save_json = serde_json::to_string_pretty(&save).unwrap();
        let path = self.resolver.resolve_resource(SAVE_NAME).expect("Error getting save path");
        std::fs::write(path, save_json).expect("Failed to write to save path");
    }

    fn load(json: &str) -> (Notebook, ChapterIndex)
    {
        let save: AppSave = serde_json::from_str(json).unwrap();
        let highlight_catagories: HashMap<_, _> = save.highlight_catagories.iter()
            .map(|(id, data)| (id.clone(), data.clone()))
            .collect();

        let chapter_highlights: HashMap<_, _> = save.chapter_highlights.iter()
            .map(|(index, highlights)| {
                let highlights_map: HashMap<_, _> = highlights.iter()
                    .map(|(word, highlights)| {
                        let mut highlights = highlights.clone();
                        highlights.retain(|h| highlight_catagories.contains_key(h));
                        (word.clone(), highlights)
                    }).collect();

                (index.clone(), highlights_map)
            }).collect();
        
        let notebook = Notebook {
            highlight_catagories,
            chapter_highlights
        };

        (notebook, save.current_chapter)
    }

    pub fn get() -> &'static Self 
    {
        unsafe 
        {
            DATA.as_ref().unwrap()
        }
    }

    pub fn get_current_chapter(&self) -> ChapterIndex
    {
        self.current_chapter.lock().unwrap().borrow().clone()
    }

    pub fn set_current_chapter(&self, chapter: ChapterIndex)
    {
        *self.current_chapter.lock().unwrap().borrow_mut() = chapter;
    }

    pub fn read_notes<F, R>(&self, mut f: F) -> R
        where F : FnMut(&mut Notebook) -> R
    {
        let binding = self.notebook.lock().unwrap();
        let mut notebook = binding.borrow_mut();
        f(&mut notebook)
    }
}