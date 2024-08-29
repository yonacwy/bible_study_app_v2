use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::bible::{ChapterIndex, WordIndex};


#[repr(C)]
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Color
{
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HighlightCategory
{
    pub color: Color,
    pub name: String,
    pub description: String,
    pub id: String,
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

pub struct Notebook
{
    pub notes: HashMap<ChapterIndex, Vec<Note>>
}