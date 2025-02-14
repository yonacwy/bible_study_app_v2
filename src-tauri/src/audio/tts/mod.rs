pub mod events;
pub mod player_thread;
pub mod synth;

use std::{collections::HashMap, sync::{Arc, Mutex}, thread::spawn};

use events::{TtsEvent, TTS_EVENT_NAME};
use kira::{sound::static_sound::{StaticSoundData, StaticSoundSettings}, AudioManager, AudioManagerSettings, DefaultBackend, Frame};
use piper_rs::synth::PiperSpeechSynthesizer;
use serde::{Deserialize, Serialize};
use synth::SpeechSynth;
use tauri::{path::{BaseDirectory, PathResolver}, AppHandle, Emitter, Runtime};

use crate::{bible::{Bible, ChapterIndex}, utils};
use self::player_thread::TtsPlayerThread;

pub const TTS_SAMPLE_RATE: u32 = 22050;

struct PassageAudio
{
    sound_data: StaticSoundData,
    chapter: ChapterIndex,
    bible: String,
    verse_data: Vec<VerseAudioData>,
}

struct VerseAudioData
{
    duration: f32,
}

impl PassageAudio
{
    pub fn new(bible: &Bible, chapter_index: ChapterIndex) -> Self 
    {

    }
}

enum TtsSoundData
{
    Generating,
    Generated(StaticSoundData)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TtsRequest
{
    pub id: String,
    pub generating: bool,
}

pub struct TtsPlayer
{
    manager: Arc<Mutex<AudioManager::<DefaultBackend>>>,
    synthesizer: Arc<SpeechSynth>,
    player: Option<TtsPlayerThread>,
    app_handle: AppHandle,

    source_ids: Arc<Mutex<HashMap<String, String>>>,
    sources: Arc<Mutex<HashMap<String, TtsSoundData>>>,
}

impl TtsPlayer 
{
    pub fn new<R>(resolver: &PathResolver<R>, app_handle: AppHandle) -> Self
        where R : Runtime
    {
        let synth = SpeechSynth::new(resolver);
        let manager = AudioManager::<DefaultBackend>::new(AudioManagerSettings::default()).unwrap();

        Self 
        {
            manager: Arc::new(Mutex::new(manager)),
            synthesizer: Arc::new(synth),
            player: None,
            app_handle,

            source_ids: Arc::new(Mutex::new(HashMap::new())),
            sources: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn request_tts(&mut self, text: String) -> TtsRequest
    {
        let mut text_binding = self.source_ids.lock().unwrap();
        let mut sources_binding = self.sources.lock().unwrap();
        
        if let Some(id) = text_binding.get(&text)
        {
            TtsRequest
            {
                id: id.clone(),
                generating: false,
            }
        }
        else 
        {
            let id = utils::get_uuid();
            text_binding.insert(text.clone(), id.clone());
            sources_binding.insert(id.clone(), TtsSoundData::Generating);

            let sources = self.sources.clone();
            let synth = self.synthesizer.clone();
            let id_inner = id.clone();
            let app_handle = self.app_handle.clone();

            spawn(move || {
                let source = synth.synth_text(text);
                sources.lock().unwrap().insert(id_inner.clone(), TtsSoundData::Generated(source));
                println!("Generated!");
                app_handle.emit(TTS_EVENT_NAME, TtsEvent::Generated { id: id_inner }).unwrap();
            });

            TtsRequest
            {
                id,
                generating: true
            }
        }
    }

    pub fn set(&mut self, id: &String)
    {
        self.stop();
        let binding = self.sources.lock().unwrap();
        if let Some(TtsSoundData::Generated(sound_data)) = binding.get(id)
        {
            self.player = Some(TtsPlayerThread::new(self.manager.clone(), self.app_handle.clone(), sound_data.clone(), id.clone()));
            self.app_handle.emit(TTS_EVENT_NAME, TtsEvent::Set { id: id.clone() }).unwrap();
        }
    }

    pub fn play(&self)
    {
        if let Some(player) = &self.player
        {
            player.play();
        }
    }

    pub fn pause(&self)
    {
        if let Some(player) = &self.player
        {
            player.pause();
        }
    }

    pub fn stop(&mut self)
    {
        if let Some(player) = self.player.take()
        {
            player.stop();
        }
    }

    pub fn is_playing(&self) -> bool
    {
        match &self.player
        {
            Some(player) => player.is_playing(),
            None => false
        }
    }

    pub fn get_duration(&self) -> Option<f32>
    {
        self.player.as_ref().map(|p| p.get_duration())
    }

    pub fn set_time(&self, time: f32)
    {
        match &self.player 
        {
            Some(player) => player.set_time(time),
            None => {},
        }
    }
}