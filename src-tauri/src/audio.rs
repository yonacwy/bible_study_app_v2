use std::{collections::HashMap, sync::{Arc, Mutex}};

use kira::{
    manager::{
        backend::DefaultBackend, error::PlaySoundError, AudioManager, AudioManagerSettings
    },
    sound::static_sound::{StaticSoundData, StaticSoundHandle, StaticSoundSettings}, tween::Tween, Volume
};
use tauri::{path::{BaseDirectory, PathResolver}, Runtime, State};

use crate::app_state::AppData;

pub const DEFAULT_SOURCES: &[(&str, &str)] = &[
    ("flip", "resources/sounds/pageturn-102978.mp3")
];

pub struct AudioPlayer
{
    manager: Arc<Mutex<AudioManager::<DefaultBackend>>>,
    sources: HashMap<String, StaticSoundData>,
}

impl AudioPlayer
{
    pub fn new<R>(resolver: &PathResolver<R>, sources: &[(&str, &str)]) -> Self 
        where R : Runtime
    {
        let manager = AudioManager::<DefaultBackend>::new(AudioManagerSettings::default()).unwrap();

        let sources: HashMap<_, _> = sources.iter().map(|(name, path)| {
            let r = resolver.resolve(path, BaseDirectory::Resource).unwrap();
            let sd = StaticSoundData::from_file(r).unwrap();
            (name.to_string(), sd)
        }).collect();

        Self 
        {
            manager: Arc::new(Mutex::new(manager)),
            sources
        }
    }

    pub fn play(&self, name: &str) -> Option<Result<StaticSoundHandle, PlaySoundError<()>>>
    {
        let Some(audio) = self.sources.get(name) else {
            return None;
        };

        Some(self.manager.lock().unwrap().play(audio.clone()))
    }
}

#[tauri::command(rename_all = "snake_case")]
pub fn play_clip(state: State<'_, AudioPlayer>, clip_name: &str)
{
    let volume = AppData::get().read_settings(|settings| settings.volume);

    match state.play(clip_name)
    {
        Some(Ok(mut handle)) => handle.set_volume(Volume::Amplitude(volume as f64), Tween::default()),
        Some(Err(e)) => println!("Error with playing audio: '{}'", e.to_string()),
        None => println!("Error: failed to load audio clip '{}'", clip_name),
    }
}