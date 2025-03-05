use std::{error::Error, hash::{DefaultHasher, Hash, Hasher}, sync::{Arc, Mutex, MutexGuard}};

use serde::{Deserialize, Serialize};

#[repr(C)]
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Color {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

impl Color {
    pub fn from_hex(hex: &str) -> Option<Self> {
        if !hex.starts_with('#') {
            return None;
        }
        let Ok(r) = u8::from_str_radix(&hex[1..=2], 16) else {
            return None;
        };
        let Ok(g) = u8::from_str_radix(&hex[3..=4], 16) else {
            return None;
        };
        let Ok(b) = u8::from_str_radix(&hex[5..=6], 16) else {
            return None;
        };

        Some(Self { r, g, b })
    }
}

pub fn get_hash_code<T>(value: &T) -> u64
where
    T: Hash,
{
    let mut s = DefaultHasher::new();
    value.hash(&mut s);
    s.finish()
}

pub fn get_uuid() -> String 
{
    uuid::Uuid::new_v4().to_string()
}

#[macro_export]
macro_rules! debug_release_val 
{
    (debug: $debug_val:expr, release: $release_val:expr $(,)?) => {
        if cfg!(debug_assertions)
        {
            $debug_val
        }
        else 
        {
            $release_val 
        }
    };
}

pub fn open(path: &str) -> Result<(), Box<dyn Error>> 
{
    open::that(path)?;
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo
{
    pub version: String,
    pub bibles: Vec<String>,
    pub save_version: String,
}

#[derive(Debug)]
pub struct Shared<T>(Arc<Mutex<T>>);

impl<T> Shared<T>
{
    pub fn new(v: T) -> Self
    {
        Self(Arc::new(Mutex::new(v)))
    }

    pub fn get(&self) -> MutexGuard<'_, T>
    {
        self.0.lock().unwrap()
    }

    pub fn inner(&self) -> &Arc<Mutex<T>>
    {
        &self.0
    }
}

impl<T> From<Arc<Mutex<T>>> for Shared<T>
{
    fn from(value: Arc<Mutex<T>>) -> Self 
    {
        Self(value)
    }
}

impl<T> From<Shared<T>> for Arc<Mutex<T>>
{
    fn from(value: Shared<T>) -> Self 
    {
        value.0
    }
}

impl<T> Clone for Shared<T>
{
    fn clone(&self) -> Self 
    {
        Self(self.0.clone())
    }
}