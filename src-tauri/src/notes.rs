use std::collections::HashMap;

use serde::{Deserialize, Serialize};

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

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Note
{
    pub color: Color,
    pub start: WordIndex,
    pub end: WordIndex,
}

pub struct Notebook
{
    pub notes: HashMap<ChapterIndex, Vec<Note>>
}