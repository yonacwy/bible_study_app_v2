use itertools::Itertools;
use serde::{Deserialize, Serialize};


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Word
{
    pub text: String,
    pub italicized: bool,
    pub red: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Verse
{
    pub words: Vec<Word>
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Chapter
{
    pub verses: Vec<Verse>
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Book 
{
    pub name: String,
    pub chapters: Vec<Chapter>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Bible
{
    pub name: String,
    pub desc: String,
    pub books: Vec<Book>,
}

impl Bible
{
    pub fn get_view(&self) -> Vec<BookView>
    {
        self.books.iter().map(|b| {
            BookView { 
                name: b.name.clone(), 
                chapter_count: b.chapters.len() as u32 
            }
        }).collect_vec()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChapterRef
{
    pub book: String,
    pub number: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BookView
{
    pub name: String,
    pub chapter_count: u32,
}