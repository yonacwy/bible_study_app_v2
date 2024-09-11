use std::{collections::HashMap, ops::RangeInclusive, str::FromStr};

use itertools::Itertools;
use regex::{Captures, Regex};
use serde::{Deserialize, Serialize};

use crate::bible::{Bible, VerseRange};

lazy_static::lazy_static! {
    static ref ALTS_MAP: HashMap<&'static str, &'static str> = {
        let mut map = HashMap::new();
        map.insert("jn", "john");
        map.insert("obd", "obadiah");
        map.insert("sos", "song of solomon");
        map
    };

    static ref BOOK_REGEX: Regex = Regex::new(r"^\s*(?<prefix>[\d]+)?\s*(?<name>\S(?:.*\S)?)\s*$").unwrap();
    static ref SEARCH_REGEX: Regex = Regex::new(r"\s*(?<prefix>[\d]+)?\s*(?<name>[a-zA-z](?:.*[a-zA-z])?)\s*(?<chapter>\d+)[:|\s*]?(?<verse_start>\d+)?-?(?<verse_end>\d+)?").unwrap();
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SectionSearch 
{
    book: u32,
    chapter: u32,
    verse_range: Option<VerseRange>,
}

pub fn parse_search(text: &str, bible: &Bible) -> Option<SectionSearch>
{
    let search = SEARCH_REGEX.captures(text).and_then(|captures| {
        let prefix: Option<u32> = load_capture(&captures, "prefix");

        let name = captures.name("name").unwrap().as_str().to_ascii_lowercase();
        let chapter: u32 = load_capture(&captures, "chapter").unwrap();
        let verse_start: Option<u32> = load_capture(&captures, "verse_start");
        let verse_end: Option<u32> = load_capture(&captures, "verse_end");

        get_section_search(prefix, &name, chapter, verse_start, verse_end, bible)
    });

    search
}

fn get_section_search(prefix: Option<u32>, book_name: &str, chapter: u32, verse_start: Option<u32>, verse_end: Option<u32>, bible: &Bible) -> Option<SectionSearch>
{
    let book_data = get_book_title_data(bible);

    let possible_books = book_data.iter().filter(|b| b.name.starts_with(book_name)).collect_vec();

    if possible_books.len() == 0 { return None; }
    let book = possible_books.iter().find(|b| b.prefix == prefix).or_else(|| {
        possible_books.first()
    }).unwrap();

    let chapter_index = if chapter > 0 
    {
        chapter - 1 // 0 based indexing conversion
    }
    else 
    {
        // 0 chapter is invalid
        return Some(SectionSearch { 
            book: book.index, 
            chapter: 0, // default to the first chapter
            verse_range: None
        });
    };

    // invalid chapter, too big for the book
    if chapter_index >= bible.books[book.index as usize].chapters.len() as u32 
    {
        return Some(SectionSearch { 
            book: book.index, 
            chapter: 0, // default to the first chapter
            verse_range: None
        });
    }

    let chapter = &bible.books[book.index as usize].chapters[chapter_index as usize];
    let Some(verse_range) = get_verse_range(verse_start, verse_end) else {
        return Some(SectionSearch {
            book: book.index, 
            chapter: chapter_index,
            verse_range: None,
        });
    };

    // can check just end, as it is guaranteed to be larger than start
    if verse_range.end >= chapter.verses.len() as u32
    {
        return Some(SectionSearch {
            book: book.index,
            chapter: chapter_index,
            verse_range: None,
        });
    }

    Some(SectionSearch {
        book: book.index,
        chapter: chapter_index,
        verse_range: Some(verse_range)
    })
}

fn get_verse_range(verse_start: Option<u32>, verse_end: Option<u32>) -> Option<VerseRange>
{
    let start = match verse_start {
        Some(start) => 
        {
            // 0 version input is invalid
            if start == 0
            {
                return None;
            }

            start - 1 // convert to 0 based indexing
        },
        None => return None,
    };

    let end = match verse_end {
        Some(end) => 
        {
            (end - 1).max(start) // also convert to 0 based indexing
        }
        None => start
    };

    Some(VerseRange { 
        start, 
        end 
    })
}

struct BookTitleData
{
    prefix: Option<u32>,
    name: String,
    index: u32,
}

fn get_book_title_data(bible: &Bible) -> Vec<BookTitleData>
{
    bible.books.iter().enumerate().map(|(i, b)| {
        let captures = BOOK_REGEX.captures(&b.name).unwrap();
        let prefix: Option<u32> = load_capture(&captures, "prefix");
        let name = captures.name("name").unwrap().as_str().to_ascii_lowercase();
        BookTitleData {
            prefix,
            name,
            index: i as u32
        }
    }).collect_vec()
}

fn load_capture<T>(captures: &Captures, name: &str) -> Option<T>
    where T : FromStr
{
    captures.name(name).and_then(|c| c.as_str().parse().ok())
}