use std::{collections::HashMap, num::ParseIntError};

use itertools::Itertools;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{bible::ChapterIndex, utils::Color};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HighlightCategory
{
    pub color: Color,
    pub name: String,
    pub description: String,
    pub priority: u32,
    pub id: String, // this is slow as heck, but should suffice for now
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Notebook
{
    pub highlight_catagories: HashMap<String, HighlightCategory>,
    pub chapter_highlights: HashMap<ChapterIndex, HashMap<u32, Vec<String>>>,
}

impl Notebook
{
    pub fn refresh_highlights(&mut self)
    {
        let highlight_ids = self.highlight_catagories.values().map(|h| h.id.clone()).collect_vec();
        for chapter_highlights in self.chapter_highlights.values_mut()
        {
            for word_highlights in chapter_highlights.values_mut()
            {
                word_highlights.retain(|id| highlight_ids.contains(id))
            }
        }
    }
}