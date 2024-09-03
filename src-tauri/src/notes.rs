use std::{collections::HashMap, num::ParseIntError};

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{bible::{ChapterIndex, WordIndex}, utils::Color};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HighlightCategory
{
    pub color: Color,
    pub name: String,
    pub description: String,
    pub priority: u32,
    pub id: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Note
{
    pub color: Color,
    pub start: WordIndex,
    pub end: WordIndex,
    pub id: String,
}

impl Note 
{
    pub fn new(color: Color, start: WordIndex, end: WordIndex) -> Self 
    {
        Self 
        {
            color,
            start,
            end,
            id: Uuid::new_v4().to_string()
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Notebook
{
    pub highlight_catagories: HashMap<u64, HighlightCategory>,
    pub notes: HashMap<ChapterIndex, Vec<Note>>
}