pub mod events;
pub mod player_thread;
pub mod synth;
pub mod reader_behavior;

use std::{collections::HashMap, sync::{Arc, Mutex}, thread::spawn};

use events::{TtsEvent, TTS_EVENT_NAME};
use itertools::Itertools;
use kira::{sound::static_sound::{StaticSoundData, StaticSoundSettings}, AudioManager, AudioManagerSettings, DefaultBackend, Frame};
use serde::{Deserialize, Serialize};
use synth::SpeechSynth;
use tauri::{path::{BaseDirectory, PathResolver}, AppHandle, Emitter, Listener, Manager, Runtime};

use crate::{bible::{Bible, ChapterIndex, VerseRange}, utils};
use self::player_thread::TtsPlayerThread;

pub const TTS_SAMPLE_RATE: u32 = 22050;

pub fn init_espeak<R>(resolver: &PathResolver<R>)
    where R : Runtime
{
    let tts_dir = resolver.resolve("resources/tts-data/espeak-ng-data", BaseDirectory::Resource).unwrap();
    std::env::set_var("PIPER_ESPEAKNG_DATA_DIRECTORY", tts_dir.into_os_string());
}

#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct TtsSettings
{
    pub volume: f32,
    pub playback_speed: f32,
}

impl Default for TtsSettings
{
    fn default() -> Self {
        Self 
        {
            volume: 1.0,
            playback_speed: 1.0,
        }
    }
}

pub struct PassageAudio
{
    pub sound_data: StaticSoundData,
    pub chapter: ChapterIndex,
    pub bible: String,
    pub verse_data: Vec<VerseAudioData>,
    pub intro_duration: f32,
}

pub struct VerseAudioData
{
    pub duration: f32,
}

impl PassageAudio
{
    pub fn new(bible: &Bible, chapter_index: ChapterIndex, verse_range: Option<VerseRange>, synth: &SpeechSynth, app_handle: &AppHandle, id: String) -> Self 
    {
        const CHAPTER_SILENCE_TIME: f32 = 0.5;
        let book = &bible.books[chapter_index.book as usize].name;
        let chapter = chapter_index.number + 1;
        let mut chapter_intro = match verse_range {
            Some(range) => synth.synth_text_to_frames(format!("{} Chapter {} verses {} to {}", book, chapter, range.start + 1, range.end + 1)),
            None => synth.synth_text_to_frames(format!("{} Chapter {}", book, chapter))
        };


        chapter_intro.append(&mut vec![Frame::ZERO; (TTS_SAMPLE_RATE as f32 * CHAPTER_SILENCE_TIME).floor() as usize]); // appends a longer silence time to the chapter intro

        let intro_duration = chapter_intro.len() as f32 / TTS_SAMPLE_RATE as f32;

        const SILENCE_TIME: f32 = 0.1;
        let silence_length = (TTS_SAMPLE_RATE as f32 * SILENCE_TIME).floor() as usize;
        let silence = vec![Frame::ZERO; silence_length];

        let chapter = bible.get_chapter(chapter_index);
        let verses = match verse_range {
            Some(r) => &chapter.verses.as_slice()[(r.start as usize)..=(r.end as usize)],
            None => &chapter.verses[..],
        };

        let verses = verses.iter()
            .map(|v| v.words.iter().map(|w| w.text.clone()).join(" "))
            .collect::<Vec<_>>();

        let verses_length = verses.len();
        let clips = verses.into_iter()
            .enumerate()
            .map(|(i, v)| {
                let frames = synth.synth_text_to_frames(v);
                let progress = i as f32 / verses_length as f32;
                app_handle.emit(TTS_EVENT_NAME, TtsEvent::GenerationProgress { id: id.clone(), progress }).unwrap();
                frames
            })
            .map(|mut v| {
                v.append(&mut silence.clone()); 
                v 
            })
            .collect::<Vec<_>>();

        let clip_times = clips.iter()
            .map(|c| c.len() as f32 / TTS_SAMPLE_RATE as f32)
            .collect::<Vec<_>>();

        let mut result = vec![];
        result.append(&mut chapter_intro);
        for mut clip in clips.into_iter()
        {
            result.append(&mut clip);
        }

        let sound_data = StaticSoundData {
            sample_rate: TTS_SAMPLE_RATE,
            frames: result.into(),
            settings: StaticSoundSettings::default(),
            slice: None
        };

        let verse_data = clip_times.into_iter()
            .map(|c| VerseAudioData { duration: c })
            .collect::<Vec<_>>();

        Self {
            sound_data,
            chapter: chapter_index,
            bible: bible.name.clone(),
            verse_data,
            intro_duration
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct PassageAudioKey
{
    pub bible_name: String,
    pub chapter: ChapterIndex,
    pub verse_range: Option<VerseRange>,
}

enum TtsSoundData
{
    Generating,
    Generated(Arc<PassageAudio>)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TtsRequest
{
    pub id: String,
    pub generating: bool,
}

pub struct TtsPlayer
{
    manager: Option<Arc<Mutex<AudioManager::<DefaultBackend>>>>,
    synthesizer: Arc<SpeechSynth>,
    player: Option<TtsPlayerThread>,
    app_handle: AppHandle,

    source_ids: HashMap<PassageAudioKey, String>,
    sources: Arc<Mutex<HashMap<String, TtsSoundData>>>,
    settings: TtsSettings,
}

impl TtsPlayer 
{
    pub fn new<R>(resolver: &PathResolver<R>, app_handle: AppHandle) -> Self
        where R : Runtime
    {
        let synth = SpeechSynth::new(resolver);
        let manager = AudioManager::<DefaultBackend>::new(AudioManagerSettings::default())
            .map(|m| Arc::new(Mutex::new(m)))
            .ok(); // Convert Result to Option, discarding the error

        let app_handle_inner = app_handle.clone();
        app_handle.listen("loaded-tts-save", move |json| {
            let state = app_handle_inner.state::<Mutex<TtsPlayer>>();
            let mut state = state.lock().unwrap();
            let parsed: TtsSettings = serde_json::from_str(json.payload()).unwrap();
            state.set_settings(parsed);
        });

        Self
        {
            manager,
            synthesizer: Arc::new(synth),
            player: None,
            app_handle,

            source_ids: HashMap::new(),
            sources: Arc::new(Mutex::new(HashMap::new())),
            settings: TtsSettings::default(),
        }
    }

    pub fn request_tts(&mut self, bible: Arc<Bible>, chapter_index: ChapterIndex, verse_range: Option<VerseRange>) -> TtsRequest
    {
        let mut sources_binding = self.sources.lock().unwrap();
        let passage_key = PassageAudioKey { bible_name: bible.name.clone(), chapter: chapter_index, verse_range };
        
        if let Some(id) = self.source_ids.get(&passage_key)
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
            self.source_ids.insert(passage_key, id.clone());
            sources_binding.insert(id.clone(), TtsSoundData::Generating);

            let sources = self.sources.clone();
            let synth = self.synthesizer.clone();
            let id_inner = id.clone();
            let app_handle = self.app_handle.clone();

            spawn(move || {
                let audio = PassageAudio::new(&bible, chapter_index, verse_range, &synth, &app_handle, id_inner.clone());
                sources.lock().unwrap().insert(id_inner.clone(), TtsSoundData::Generated(Arc::new(audio)));
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
            if let Some(manager) = self.manager.clone() {
                self.player = Some(TtsPlayerThread::new(manager, self.app_handle.clone(), sound_data.clone(), id.clone(), self.settings));
            } else {
                self.player = None; // No audio manager, so no player thread
            }
            if let Some(player) = self.player.as_mut() {
                player.set_settings(self.settings);
            }
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

    pub fn set_settings(&mut self, settings: TtsSettings)
    {
        self.settings = settings;
        if let Some(player) = &mut self.player
        {
            player.set_settings(settings);
        }
    }

    pub fn get_settings(&self) -> TtsSettings
    {
        self.settings
    }
}