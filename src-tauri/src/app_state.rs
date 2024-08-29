use std::{cell::{RefCell, RefMut}, collections::HashMap, sync::Mutex};

use crate::{bible::*, notes::*, parsing};


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

        let mut notes = HashMap::new();
        notes.insert(ChapterIndex { book: 0, number: 0}, vec![Note::new(
            Color { r: 100, g: 50, b: 100 },
            WordIndex { verse: 0, word: 0 },
            WordIndex { verse: 0, word: 1 },
        )]);

        notes.insert(ChapterIndex { book: 2, number: 1}, vec![
            Note::new(
                Color { r: 255, g: 233, b: 0 },
                WordIndex { verse: 2, word: 0 },
                WordIndex { verse: 2, word: 1 },
            ),
            Note::new(
                Color { r: 100, g: 50, b: 100 },
                WordIndex { verse: 1, word: 0 },
                WordIndex { verse: 1, word: 1 },
            ),
        ]);

        let notebook = Notebook {
            notes
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