use std::{collections::HashMap, str::FromStr};

use itertools::Itertools;
use regex::{Captures, Regex};
use serde::{Deserialize, Serialize};

use crate::bible::{Bible, Verse, VerseRange};

lazy_static::lazy_static! {
    static ref ALTS_MAP: HashMap<&'static str, &'static str> = {
        let map = HashMap::from([
            ("nm", "numbers"),
            ("dt", "deuteronomy"),
            ("jsh", "joshua"),
            ("jdg", "judges"),
            ("jdgs", "judges"),
            ("sm", "samuel"),
            ("jb", "job"),
            ("pss", "psalm"),
            ("psalms", "psalm"),
            ("prv", "proverbs"),
            ("sg", "song of solomon"),
            ("ss", "song of solomon"),
            ("sos", "song of solomon"),
            ("jl", "joel"),
            ("obd", "obadiah"),
            ("hb", "habakkuk"),
            ("hg", "haggai"),
            ("ml", "malachi"),
            ("mt", "matthew"),
            ("mk", "mark"),
            ("lk", "luke"),
            ("jn", "john"),
            ("jas", "james"),
            ("php", "philippians"),
            ("phm", "philemon"),
        ]);
        map
    };

    static ref BOOK_REGEX: Regex = Regex::new(r"^\s*(?<prefix>\d+)?\s*(?<name>[\S][\S\s]*?)?\s*$").unwrap();
    static ref SEARCH_REGEX: Regex = Regex::new(r"\s*(?<prefix>\d+)?\s*(?<name>[a-zA-Z](?:.*?[a-zA-Z])?)\s*(?<chapter>\d+)[:|\s*]?(?<verse_start>\d+)?-?(?<verse_end>\d+)?").unwrap();
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct SectionSearchResult {
    pub book: u32,
    pub chapter: u32,
    pub verse_range: Option<VerseRange>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordSearchResult {
    pub book: u32,
    pub chapter: u32,
    pub verse: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "type")]
pub enum ParsedSearchResult {
    Section { section: SectionSearchResult },
    // don't send over all the words yet, as we first need to move to another page, then we can load the search from this page
    // essentially, doing the same thing as the section (key to a search)
    Word { words: Vec<String> }, 
    Error { error: String },
}

pub fn parse_search(text: &str, bible: &Bible) -> ParsedSearchResult {
    if text.chars().all(char::is_whitespace) {
        return ParsedSearchResult::Error {
            error: "Search must contain a word".into(),
        };
    }

    if text.is_empty() {
        return ParsedSearchResult::Error {
            error: "Search must contain a word".into(),
        };
    }

    let search = SEARCH_REGEX.captures(text).and_then(|captures| {
        let prefix: Option<u32> = load_capture(&captures, "prefix");

        let name = captures.name("name").unwrap().as_str().to_ascii_lowercase();
        let chapter: u32 = load_capture(&captures, "chapter").unwrap();
        let verse_start: Option<u32> = load_capture(&captures, "verse_start");
        let verse_end: Option<u32> = load_capture(&captures, "verse_end");

        Some(get_section_search(
            prefix,
            &name,
            chapter,
            verse_start,
            verse_end,
            bible,
        ))
    });

    match search {
        Some(Ok(section)) => ParsedSearchResult::Section { section },
        Some(Err(error)) => ParsedSearchResult::Error { error },
        None => match check_word_search(text) {
            Ok(words) => ParsedSearchResult::Word { words },
            Err(error) => ParsedSearchResult::Error { error },
        },
    }
}

fn check_word_search(text: &str) -> Result<Vec<String>, String> {
    if text.contains(|c: char| !(c.is_ascii_alphanumeric() || c.is_whitespace() || c == '\'')) {
        return Err("searched words can only be words or numbers".into());
    }

    let words = text
        .split(char::is_whitespace)
        .map(|s| s.trim())
        .filter(|s| s.len() > 0)
        .map(|s| s.to_string())
        .collect_vec();

    Ok(words)
}

pub fn search_bible(words: &[&str], bible: &Bible) -> Vec<WordSearchResult> {
    let word_frequencies = words
        .iter()
        .map(|w| w.to_ascii_lowercase())
        .counts()
        .into_iter()
        .map(|(word, frequency)| WordFrequency {
            word,
            frequency: frequency as u32,
        })
        .collect_vec();

    let mut results = vec![];
    for (book_index, book) in bible.books.iter().enumerate() {
        for (chapter_index, chapter) in book.chapters.iter().enumerate() {
            for (verse_index, verse) in chapter.verses.iter().enumerate() {
                if has_words(&word_frequencies, verse) {
                    results.push(WordSearchResult {
                        book: book_index as u32,
                        chapter: chapter_index as u32,
                        verse: verse_index as u32,
                    });
                }
            }
        }
    }

    results
}

struct WordFrequency {
    word: String,
    frequency: u32,
}

fn has_words(words: &[WordFrequency], verse: &Verse) -> bool {
    let mut checker = vec![0; words.len()];
    for word in verse.words.iter().map(|w| &w.text) {
        let trimmed = word.trim_matches(|c: char| !c.is_alphanumeric());
        if let Some(index) = words
            .iter()
            .position(|w| w.word.eq_ignore_ascii_case(trimmed))
        {
            checker[index] += 1;
        }
    }

    checker
        .iter()
        .zip(words.iter())
        .all(|(v, f)| *v >= f.frequency)
}

fn get_section_search(
    prefix: Option<u32>,
    book_name: &str,
    chapter: u32,
    verse_start: Option<u32>,
    verse_end: Option<u32>,
    bible: &Bible,
) -> Result<SectionSearchResult, String> {

    let book = match get_book_from_name(prefix, book_name, bible) 
    {
        Ok(value) => value,
        Err(value) => return Err(value),
    };

    let chapter_index = if chapter > 0 {
        chapter - 1 // 0 based indexing conversion
    } else {
        // 0 chapter is invalid
        return Ok(SectionSearchResult {
            book: book.index,
            chapter: 0, // default to the first chapter
            verse_range: None,
        });
    };

    // invalid chapter, too big for the book
    if chapter_index >= bible.books[book.index as usize].chapters.len() as u32 {
        return Ok(SectionSearchResult {
            book: book.index,
            chapter: 0, // default to the first chapter
            verse_range: None,
        });
    }

    let chapter = &bible.books[book.index as usize].chapters[chapter_index as usize];
    let Some(verse_range) = get_verse_range(verse_start, verse_end) else {
        return Ok(SectionSearchResult {
            book: book.index,
            chapter: chapter_index,
            verse_range: None,
        });
    };

    // can check just end, as it is guaranteed to be larger than start
    if verse_range.end >= chapter.verses.len() as u32 {
        return Ok(SectionSearchResult {
            book: book.index,
            chapter: chapter_index,
            verse_range: None,
        });
    }

    Ok(SectionSearchResult {
        book: book.index,
        chapter: chapter_index,
        verse_range: Some(verse_range),
    })
}

pub fn get_book_from_name<'a>(prefix: Option<u32>, book_name: &str, bible: &Bible) -> Result<BookTitleData, String> 
{
    let book_name = book_name.to_ascii_lowercase();

    let book_data = get_book_title_data(bible);
    let book_name = match ALTS_MAP.get(book_name.as_str()) {
        Some(s) => &s,
        None => book_name.as_str(),
    };
    let possible_books = book_data
        .iter()
        .filter(|b| b.name.starts_with(book_name))
        .collect_vec();
    if possible_books.len() == 0 {
        return Err(format!("The book of `{}`, does not exist", book_name));
    }
    let book = possible_books
        .iter()
        .find(|b| b.prefix == prefix)
        .or_else(|| possible_books.first())
        .unwrap();
    Ok((**book).clone())
}

fn get_verse_range(verse_start: Option<u32>, verse_end: Option<u32>) -> Option<VerseRange> {
    let start = match verse_start {
        Some(start) => {
            // 0 version input is invalid
            if start == 0 {
                return None;
            }

            start - 1 // convert to 0 based indexing
        }
        None => return None,
    };

    let end = match verse_end {
        Some(end) => {
            (end - 1).max(start) // also convert to 0 based indexing
        }
        None => start,
    };

    Some(VerseRange { start, end })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookTitleData {
    pub prefix: Option<u32>,
    pub name: String,
    pub index: u32,
}

fn get_book_title_data(bible: &Bible) -> Vec<BookTitleData> {
    bible
        .books
        .iter()
        .enumerate()
        .map(|(i, b)| {
            let captures = BOOK_REGEX.captures(&b.name).unwrap();
            let prefix: Option<u32> = load_capture(&captures, "prefix");
            let name = captures.name("name").unwrap().as_str().to_ascii_lowercase();
            BookTitleData {
                prefix,
                name,
                index: i as u32,
            }
        })
        .collect_vec()
}

fn load_capture<T>(captures: &Captures, name: &str) -> Option<T>
where
    T: FromStr,
{
    captures.name(name).and_then(|c| c.as_str().parse().ok())
}
