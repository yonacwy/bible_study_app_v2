use std::{collections::HashMap, num::ParseIntError};

use itertools::Itertools;
use serde::{Deserialize, Serialize};
use serde_with::serde_as;
use uuid::Uuid;

use crate::{bible::{ChapterIndex, ReferenceLocation}, utils::Color};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HighlightCategory
{
    pub color: Color,
    pub name: String,
    pub description: String,
    pub priority: u32,
    pub id: String, // this is slow as heck, but should suffice for now
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteData 
{
    pub id: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordAnnotations
{
    pub highlights: Vec<String>,
    pub notes: Vec<String>
}

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notebook
{
    pub highlight_catagories: HashMap<String, HighlightCategory>,
    pub notes: HashMap<String, NoteData>,
    
    #[serde_as(as = "Vec<(_, _)>")]
    pub favorite_verses: HashMap<ChapterIndex, u32>,
    
    #[serde_as(as = "Vec<(_, _)>")]
    pub section_headings: HashMap<ChapterIndex, HashMap<u32, String>>,
    
    #[serde_as(as = "Vec<(_, _)>")]
    pub annotations: HashMap<ChapterIndex, HashMap<u32, WordAnnotations>>,
}

impl Notebook
{
    pub fn refresh_highlights(&mut self)
    {
        let highlight_ids = self.highlight_catagories.values().map(|h| h.id.clone()).collect_vec();
        for chapter_highlights in self.annotations.values_mut()
        {
            for word_highlights in chapter_highlights.values_mut()
            {
                word_highlights.highlights.retain(|id| highlight_ids.contains(id))
            }
        }
    }
}