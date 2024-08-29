use serde::{Deserialize, Serialize};


#[repr(C)]
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Color
{
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

pub struct Note
{
    pub color: Color,
}