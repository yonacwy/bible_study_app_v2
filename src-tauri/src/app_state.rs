use std::{cell::{RefCell, RefMut}, collections::HashMap, sync::Mutex};

use crate::{bible::*, notes::*, parsing, utils::Color};


static mut DATA: Option<AppData> = None;

pub struct AppData
{
    pub bible: Bible,
    notebook: Mutex<RefCell<Notebook>>,
    current_chapter: Mutex<RefCell<ChapterIndex>>,
}

impl AppData
{
    pub fn init(bible_text: &str)
    {
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
                current_chapter: Mutex::new(RefCell::new(chapter))
            })
        }
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