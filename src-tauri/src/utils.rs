use std::hash::{DefaultHasher, Hash, Hasher};

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

impl Color 
{
    pub fn from_hex(hex: &str) -> Option<Self>
    {
        if !hex.starts_with('#') { return None; }
        let Ok(r) = u8::from_str_radix(&hex[1..=2], 16) else { return None; };
        let Ok(g) = u8::from_str_radix(&hex[3..=4], 16) else { return None; };
        let Ok(b) = u8::from_str_radix(&hex[5..=6], 16) else { return None; };

        Some(Self { r, g, b })
    }
}

pub fn get_hash_code<T>(value: &T) -> u64 
    where T : Hash
{
    let mut s = DefaultHasher::new();
    value.hash(&mut s);
    s.finish()
}