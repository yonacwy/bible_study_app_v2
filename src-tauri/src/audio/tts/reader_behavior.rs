use std::num::NonZeroU32;

use serde::{Deserialize, Serialize};

use crate::bible::ChapterIndex;

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq)]
#[serde(rename_all = "snake_case", tag = "type", content = "data")]
pub enum RepeatOptions
{
    NoRepeat,
    RepeatCount(u32),
    RepeatTime(f32),
    Infinite,
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq)]
#[serde(rename_all = "snake_case", tag = "type", content = "data")]
pub enum ReaderBehavior
{
    Segment
    {
        start: ChapterIndex,
        length: Option<NonZeroU32>, // if None, we just keep going
        options: RepeatOptions,
    },
    Daily
    {
        month: u32,
        day: u32,
        options: RepeatOptions
    }
}

impl ReaderBehavior
{
    pub fn default(chapter: ChapterIndex) -> Self 
    {
        Self::Segment { 
            start: chapter, 
            length: Some(NonZeroU32::new(1).unwrap()), 
            options: RepeatOptions::NoRepeat 
        }
    }
}