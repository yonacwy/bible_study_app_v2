pub mod color;
pub mod macros;

use std::{hash::{DefaultHasher, Hash, Hasher}, sync::{Arc, Mutex, MutexGuard}};

use serde::{Deserialize, Serialize};

pub use color::*;

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

pub fn dedup_by_predicate<T, F>(items: Vec<T>, mut predicate: F) -> Vec<T>
    where T: Clone,
          F: FnMut(&T, &T) -> bool,
{
    let mut result = Vec::new();
    for item in items {
        if !result.iter().any(|x| predicate(x, &item)) {
            result.push(item);
        }
    }
    result
}