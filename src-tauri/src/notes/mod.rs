pub mod action;
mod test;

use std::collections::HashMap;

use itertools::Itertools;
use serde::{Deserialize, Serialize};
use serde_with::serde_as;

use crate::{
    bible::{Bible, ChapterIndex, ReferenceLocation},
    utils::Color,
};

pub type NotebookMap = HashMap<String, Notebook>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HighlightCategory {
    pub color: Color,
    pub name: String,
    pub description: String,
    pub source_type: NoteSourceType,
    pub priority: u32,
    pub id: String, // this is slow as heck, but should suffice for now
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum NoteSourceType
{
    Html,
    Json,
    Markdown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NoteData {
    pub id: String,
    pub text: String,
    pub locations: Vec<ReferenceLocation>,
    pub source_type: NoteSourceType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordAnnotations {
    pub highlights: Vec<String>,
    pub notes: Vec<String>,
}

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Notebook {
    pub highlight_categories: HashMap<String, HighlightCategory>,
    pub notes: HashMap<String, NoteData>,

    #[serde_as(as = "Vec<(_, _)>")]
    pub favorite_verses: HashMap<ChapterIndex, u32>,

    #[serde_as(as = "Vec<(_, _)>")]
    pub section_headings: HashMap<ChapterIndex, HashMap<u32, String>>,

    #[serde_as(as = "Vec<(_, _)>")]
    pub annotations: HashMap<ChapterIndex, HashMap<u32, WordAnnotations>>,
}

impl Notebook {

    pub fn is_empty(&self) -> bool
    {
        self.highlight_categories.len() == 0 && 
        self.notes.len()                == 0 && 
        self.favorite_verses.len()      == 0 && 
        self.section_headings.len()     == 0 && 
        self.annotations.len()          == 0
    }

    pub fn refresh_highlights(&mut self) 
    {
        let highlight_ids = self.highlight_categories
            .values()
            .map(|h| h.id.clone())
            .collect_vec();

        for chapter_highlights in self.annotations.values_mut() 
        {
            for word_highlights in chapter_highlights.values_mut() 
            {
                word_highlights.highlights
                    .retain(|id| highlight_ids.contains(id))
            }
        }
    }

    pub fn add_note(&mut self, note: NoteData, bible: &Bible) 
    {
        for location in &note.locations {
            let chapter = bible.get_chapter(location.chapter).get_view();
            for word_index in location.range.get_chapter_word_indices(&chapter) {
                let chapter_annotations = self.annotations
                    .entry(location.chapter)
                    .or_insert(HashMap::default());

                let word_annotations = chapter_annotations
                        .entry(word_index)
                        .or_insert(WordAnnotations {
                            highlights: vec![],
                            notes: vec![],
                        });

                if !word_annotations.notes.contains(&note.id) {
                    word_annotations.notes.push(note.id.clone());
                }
            }
        }

        self.notes.insert(note.id.clone(), note);
    }

    pub fn remove_note(&mut self, id: &str) 
    {
        let Some(note) = &self.notes.get(id) else {
            println!("Tried to remove note {}, which does not exist", id);
            return;
        };

        for location in &note.locations 
        {
            for chapter_annotations in self
                .annotations
                .get_mut(&location.chapter)
                .unwrap()
                .values_mut()
            {
                chapter_annotations.notes.retain(|id| note.id != *id);
            }
        }

        self.notes.remove(id);
    }

    pub fn update_note(&mut self, note: NoteData, bible: &Bible)
    {
        self.remove_note(&note.id);
        self.add_note(note, bible);
    }

    pub fn get_note(&self, id: &str) -> &NoteData 
    {
        self.notes.get(id).unwrap()
    }

    pub fn has_note(&self, id: &str) -> bool
    {
        self.notes.get(id).is_some()
    }
}
