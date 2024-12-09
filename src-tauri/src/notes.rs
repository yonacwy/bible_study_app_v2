use std::collections::HashMap;

use itertools::Itertools;
use serde::{Deserialize, Serialize};
use serde_with::serde_as;

use crate::{
    bible::{Bible, ChapterIndex, ReferenceLocation},
    utils::Color,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HighlightCategory {
    pub color: Color,
    pub name: String,
    pub description: String,
    pub priority: u32,
    pub id: String, // this is slow as heck, but should suffice for now
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteData {
    pub id: String,
    pub text: String,
    pub locations: Vec<ReferenceLocation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordAnnotations {
    pub highlights: Vec<String>,
    pub notes: Vec<String>,
}

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Notebook {
    pub highlight_catagories: HashMap<String, HighlightCategory>,
    pub notes: HashMap<String, NoteData>,

    #[serde_as(as = "Vec<(_, _)>")]
    pub favorite_verses: HashMap<ChapterIndex, u32>,

    #[serde_as(as = "Vec<(_, _)>")]
    pub section_headings: HashMap<ChapterIndex, HashMap<u32, String>>,

    #[serde_as(as = "Vec<(_, _)>")]
    pub annotations: HashMap<ChapterIndex, HashMap<u32, WordAnnotations>>,
}

impl Notebook {
    pub fn refresh_highlights(&mut self) {
        let highlight_ids = self
            .highlight_catagories
            .values()
            .map(|h| h.id.clone())
            .collect_vec();
        for chapter_highlights in self.annotations.values_mut() {
            for word_highlights in chapter_highlights.values_mut() {
                word_highlights
                    .highlights
                    .retain(|id| highlight_ids.contains(id))
            }
        }
    }

    pub fn add_note(
        &mut self,
        bible: &Bible,
        id: String,
        text: String,
        locations: Vec<ReferenceLocation>,
    ) {
        for location in &locations {
            let chapter = bible.get_chapter(location.chapter).get_view();
            for word_index in location.range.get_chapter_word_indices(&chapter) {
                let chapter_annotations = self
                    .annotations
                    .entry(location.chapter)
                    .or_insert(HashMap::default());
                let word_annotations =
                    chapter_annotations
                        .entry(word_index)
                        .or_insert(WordAnnotations {
                            highlights: vec![],
                            notes: vec![],
                        });

                if !word_annotations.notes.contains(&id) {
                    word_annotations.notes.push(id.clone());
                }
            }
        }

        self.notes.insert(
            id.clone(),
            NoteData {
                id,
                text,
                locations,
            },
        );
    }

    pub fn remove_note(&mut self, id: &str) {
        let note = &self.notes[id];
        for location in &note.locations {
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

    pub fn get_note(&self, id: &str) -> &NoteData {
        self.notes.get(id).unwrap()
    }
}
