use std::{fs, num::NonZeroU32, ops::{Range, RangeInclusive}, path::Path};

use serde_json::Value;

#[derive(Debug, Clone)]
pub struct Bible
{
    pub name: String,
    pub description: String,
    pub books: Vec<Book>
}

#[derive(Debug, Clone)]
pub struct Book 
{
    pub name: String,
    pub chapters: Vec<Chapter>,
}

#[derive(Debug, Clone)]
pub struct Chapter 
{
    pub number: NonZeroU32,
    pub verses: Vec<Verse>,
}

#[derive(Debug, Clone)]
pub struct Verse 
{
    pub number: NonZeroU32,
    pub text: String,
}

pub fn parse_json_file(path: &str) -> Result<Bible, String>
{
    let file_src = match fs::read(path)
    {
        Ok(ok) => match String::from_utf8(ok)
        {
            Ok(ok) => ok,
            Err(err) => return Err(err.to_string()),
        }
        Err(err) => return Err(err.to_string())
    };

    let json = match serde_json::from_str::<Value>(&file_src)
    {
        Ok(ok) => ok,
        Err(err) => return Err(err.to_string()),
    };
    
    let name = Path::new(path).file_stem().unwrap().to_str().unwrap().to_owned(); // should already be a proper file name

    let Some(books) = json.get("books").and_then(|b| b.as_array()) else {
        return Err("Expected a 'books' field".into());
    };

    let books = books.iter().map(|b| {
        let Some(name) = b.get("name").and_then(|n| n.as_str()).and_then(|n| Some(n.to_owned())) else {
            return Err("Expected a 'book' string field".into());
        };

        let Some(chapters) = b.get("chapters").and_then(|c| c.as_array()) else {
            return Err("Expected a 'chapters' array field".into());
        };

        let chapters = chapters.iter().map(|c| {
            let Some(number) = c.get("chapter").and_then(|c| c.as_u64()).and_then(|c| NonZeroU32::new(c as u32)) else {
                return Err("Expected a 'chapter' non zero unsigned int field".into());
            };

            let Some(verses) = c.get("verses").and_then(|v| v.as_array()) else {
                return Err("Expected a array 'verses' field".into());
            };

            let verses = verses.iter().map(|v| {
                let Some(number) = v.get("verse").and_then(|c| c.as_u64()).and_then(|c| NonZeroU32::new(c as u32)) else {
                    return Err("Expected a 'verse' non zero unsigned int field".into());
                };

                let Some(text) = v.get("text").and_then(|n| n.as_str()).and_then(|n| Some(n.to_owned())) else {
                    return Err("Expected a 'text' string field".into());
                };

                Ok(Verse {
                    number,
                    text
                })
            }).collect::<Result<Vec<Verse>, String>>()?;

            Ok(Chapter {
                number,
                verses
            })

        }).collect::<Result<Vec<Chapter>, String>>()?;

        Ok(Book {
            name,
            chapters
        })
    }).collect::<Result<Vec<Book>, String>>()?;

    
    Ok(Bible {
        name,
        description: "".into(),
        books
    })
}

pub fn make_small(bible: &Bible) -> Bible
{
    const GEN_INDEX: usize = 0;
    const NUM_INDEX: usize = 3;
    const SAM_1_INDEX: usize = 8;
    const SAM_2_INDEX: usize = 9;
    const PS_INDEX: usize = 18;
    const SOS_INDEX: usize = 21;
    const MAL_INDEX: usize = 38;
    const MAT_INDEX: usize = 39;
    
    make_gen_copy(bible, &[
        (GEN_INDEX, &[Some(9)]),
        (NUM_INDEX, &[Some(8), Some(7), Some(11)]),
        (SAM_1_INDEX, &[Some(10)]),
        (SAM_2_INDEX, &[Some(8)]),
        (PS_INDEX, &[None; 10]),
        (SOS_INDEX, &[Some(9)]),
        (MAL_INDEX, &[Some(14), Some(1)]),
        (MAT_INDEX, &[Some(9)])
    ])
}

fn make_gen_copy(bible: &Bible, ranges: &[(usize, &[Option<usize>])]) -> Bible
{
    let books = ranges.iter().map(|(book_index, chapter_ranges)| {
        let book = &bible.books[*book_index];
        let chapters = chapter_ranges.iter().enumerate().map(|(index, range)| {
            let verses = match range {
                Some(i) => book.chapters[index].verses[0..*i].to_vec(),
                None => book.chapters[index].verses[..].to_vec()
            };

            Chapter {
                number: NonZeroU32::new(index as u32 + 1).unwrap(),
                verses,
            }
        }).collect();

        Book {
            name: book.name.clone(),
            chapters,
        }
    }).collect();

    Bible {
        name: bible.name.clone(),
        description: bible.description.clone(),
        books,
    }
}