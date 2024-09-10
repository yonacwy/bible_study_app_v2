use std::{cell::RefCell, collections::HashMap, sync::Mutex};

use itertools::Itertools;
use serde::{Deserialize, Serialize};
use tauri::PathResolver;

use crate::{bible::*, notes::*, parsing, utils::Color};


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
            println!("{}", path.to_str().unwrap());
            std::fs::read(path).ok()
        })
        .and_then(|data| {
            String::from_utf8(data).ok()
        });

        println!("{:?}", file);

        let bible = parsing::parse_bible(bible_text).unwrap();
        let chapter = ChapterIndex {
            book: 0,
            number: 0
        };
        
        let mut highlight_catagories = HashMap::new();

        let test_id1 = uuid::Uuid::new_v4().to_string();
        highlight_catagories.insert(test_id1.clone(), HighlightCategory {
            color: Color::from_hex("#FF0000").unwrap(),
            name: "Red".into(),
            description: "A red highlight".into(),
            priority: 4,
            id: test_id1.clone(),
        });

        let test_id2 = uuid::Uuid::new_v4().to_string();
        highlight_catagories.insert(test_id2.clone(), HighlightCategory {
            color: Color::from_hex("#00FF00").unwrap(),
            name: "Green".into(),
            description: "A blue highlight".into(),
            priority: 3,
            id: test_id2.clone(),
        });

        let test_id3 = uuid::Uuid::new_v4().to_string();
        highlight_catagories.insert(test_id3.clone(), HighlightCategory {
            color: Color::from_hex("#0000FF").unwrap(),
            name: "Blue".into(),
            description: "A green highlight".into(),
            priority: 0,
            id: test_id3.clone(),
        });

        let chapter_highlights = HashMap::new();

        let notebook = Notebook {
            highlight_catagories,
            chapter_highlights,
        };

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
                    .map(|t| t.clone()).collect();

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