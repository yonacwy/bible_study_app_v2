use itertools::Itertools;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Word {
    pub text: String,
    pub italicized: bool,
    pub red: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Verse {
    pub words: Vec<Word>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Chapter {
    pub verses: Vec<Verse>,
}

impl Chapter {
    pub fn get_view(&self) -> ChapterView {
        let verses = self.verses.iter().map(|v| v.words.len() as u32).collect();
        ChapterView { verses }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Book {
    pub name: String,
    pub chapters: Vec<Chapter>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Bible {
    pub name: String,
    pub desc: String,
    pub books: Vec<Book>,
}

impl Bible {
    pub fn get_view(&self) -> BibleView {
        let books = self.books
            .iter()
            .map(|b| BookView {
                name: b.name.clone(),
                chapter_count: b.chapters.len() as u32,
            })
            .collect_vec();

        BibleView 
        {
            books
        }
    }

    pub fn get_chapter(&self, index: ChapterIndex) -> &Chapter {
        &self.books[index.book as usize].chapters[index.number as usize]
    }
}

pub struct BibleView
{
    pub books: Vec<BookView>
}

impl BibleView 
{
    pub fn increment_chapter(&self, chapter: ChapterIndex, count: u32) -> ChapterIndex
    {
        let mut book = chapter.book as usize;
        let mut number = chapter.number as usize;

        for _ in 0..count
        {
            if number < self.books[book].chapter_count as usize - 1
            {
                number += 1;
            }
            else if book < self.books.len() - 1 
            {
                book += 1;
                number = 0;    
            }
            else 
            {
                book = 0;
                number = 0;
            }
        }

        ChapterIndex {
            book: book as u32,
            number: number as u32
        }
    }
}

#[repr(C)]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct ChapterIndex {
    pub book: u32,
    pub number: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookView {
    pub name: String,
    pub chapter_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChapterView {
    pub verses: Vec<u32>,
}

impl ChapterView {
    pub fn flatten_word_index(&self, verse_index: u32, verse_word_index: u32) -> u32 {
        let mut offset = 0;
        for v in 0..verse_index {
            offset += self.verses[v as usize];
        }

        offset += verse_word_index;
        offset
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct VerseRange {
    pub start: u32,
    pub end: u32,
}

/// Note: All values are inclusive
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct WordRange {
    pub verse_start: u32,
    pub word_start: u32,
    pub verse_end: u32,
    pub word_end: u32,
}

impl WordRange {
    pub fn get_chapter_word_indices(&self, view: &ChapterView) -> Vec<u32> {
        let mut indices = vec![];
        let mut offset = if self.verse_start != 0 {
            view.verses[0..(self.verse_start as usize)]
                .iter()
                .sum::<u32>()
                + self.word_start
        } else {
            self.word_start
        };

        for v in self.verse_start..=self.verse_end {
            let word_start = if v == self.verse_start {
                self.word_start
            } else {
                0
            };
            let word_end = if v == self.verse_end {
                self.word_end
            } else {
                view.verses[v as usize] - 1
            };
            for _ in word_start..=word_end {
                indices.push(offset);
                offset += 1;
            }
        }

        indices
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub struct ReferenceLocation {
    pub chapter: ChapterIndex,
    pub range: WordRange,
}
