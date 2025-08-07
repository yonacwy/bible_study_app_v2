use std::{collections::HashMap, sync::{Arc, Mutex}};
use kira::{sound::static_sound::{StaticSoundData, StaticSoundHandle}, AudioManager, AudioManagerSettings, DefaultBackend, PlaySoundError };
use tauri::{path::{BaseDirectory, PathResolver}, Runtime};

pub const DEFAULT_SOURCES: &[(&str, &str)] = &[
    ("flip", "resources/sounds/pageturn-102978.mp3")
];

pub struct AudioPlayer
{
    manager: Option<Arc<Mutex<AudioManager::<DefaultBackend>>>>,
    sources: HashMap<String, StaticSoundData>,
}

impl AudioPlayer
{
    pub fn new<R>(resolver: &PathResolver<R>, sources: &[(&str, &str)]) -> Self 
        where R : Runtime
    {
        let manager = AudioManager::<DefaultBackend>::new(AudioManagerSettings::default())
            .map(|m| Arc::new(Mutex::new(m)))
            .ok(); // Convert Result to Option, discarding the error

        let sources: HashMap<_, _> = sources.iter().map(|(name, path)| {
            let r = resolver.resolve(path, BaseDirectory::Resource).unwrap();
            let sd = StaticSoundData::from_file(r).unwrap();
            (name.to_string(), sd)
        }).collect();

        Self 
        {
            manager,
            sources
        }
    }

    pub fn play(&self, name: &str) -> Option<Result<StaticSoundHandle, PlaySoundError<()>>>
    {
        let Some(audio) = self.sources.get(name) else {
            return None;
        };

        if let Some(manager) = self.manager.clone() {
            Some(manager.lock().unwrap().play(audio.clone()))
        } else {
            None
        }
    }
}