use std::{cell::RefCell, sync::Mutex};

use crate::{bible::*, parsing};


static mut DATA: Option<AppData> = None;

pub struct AppData
{
    pub bible: Bible,
    pub chapter: Mutex<RefCell<ChapterRef>>,
}

impl AppData
{
    pub fn init(bible_text: &str)
    {
        let bible = parsing::parse_bible(bible_text).unwrap();
        let chapter = ChapterRef {
            book: bible.books[0].name.clone(),
            number: 0
        };

        unsafe 
        {
            DATA = Some(Self {
                bible,
                chapter: Mutex::new(RefCell::new(chapter))
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

    pub fn get_current_chapter(&self) -> ChapterRef
    {
        self.chapter.lock().unwrap().borrow().clone()
    }

    pub fn set_current_chapter(&self, chapter: ChapterRef)
    {
        *self.chapter.lock().unwrap().borrow_mut() = chapter;
    }
}