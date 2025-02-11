use std::{collections::HashMap, sync::{Arc, Mutex}, thread::{spawn, JoinHandle}, time::SystemTime};

use kira::{backend::Backend, sound::{static_sound::{StaticSoundData, StaticSoundHandle, StaticSoundSettings}, PlaybackState}, AudioManager, AudioManagerSettings, DefaultBackend, Frame, Tween};
use piper_rs::synth::PiperSpeechSynthesizer;
use serde::{Deserialize, Serialize};
use tauri::{path::{BaseDirectory, PathResolver}, AppHandle, Emitter, Runtime, State};

use crate::utils;

const TTS_EVENT_NAME: &str = "tts_event";

struct TtsPlayerThread 
{
    handle: Arc<Mutex<StaticSoundHandle>>,
    running: Arc<Mutex<bool>>,
    thread_handle: JoinHandle<()>,
    sound_id: String,
    app_handle: AppHandle,
    duration: f32,
}

impl TtsPlayerThread
{
    pub fn new<B>(manager: &mut AudioManager<B>, app_handle: AppHandle, sound_data: StaticSoundData, sound_id: String) -> Self
        where B : Backend
    {
        // start the handle paused
        let duration = sound_data.duration().as_secs_f32();
        let mut sound_handle = manager.play(sound_data).unwrap();
        sound_handle.pause(Tween::default());
        let sound_handle = Arc::new(Mutex::new(sound_handle));
        let sound_handle_inner = sound_handle.clone();
        let app_handle_inner = app_handle.clone();

        let running = Arc::new(Mutex::new(true));
        let running_inner = running.clone();

        let sound_id_inner = sound_id.clone();

        let thread_handle = spawn(move || {
            const UPDATE_TIME: f32 = 0.5;
            
            let mut time = SystemTime::now();
            while *running_inner.lock().unwrap()
            {
                // make sure we don't constantly play events
                if time.elapsed().unwrap().as_secs_f32() < UPDATE_TIME { continue; }
                time = SystemTime::now();

                let sound_handle = sound_handle_inner.lock().unwrap();
                if let PlaybackState::Playing = sound_handle.state()
                {
                    app_handle_inner.emit(TTS_EVENT_NAME, TtsEvent::Playing { 
                        id: sound_id_inner.clone(), 
                        elapsed: sound_handle.position() as f32 / duration, 
                        duration 
                    }).unwrap();
                }
            }
        });

        Self 
        {
            handle: sound_handle,
            running,
            thread_handle,
            sound_id,
            app_handle,
            duration
        }
    }

    pub fn play(&self)
    {
        self.handle.lock().unwrap().resume(Tween::default());
        self.app_handle.emit(TTS_EVENT_NAME, TtsEvent::Played { id: self.sound_id.clone() }).unwrap();
    }

    pub fn pause(&self)
    {
        self.handle.lock().unwrap().pause(Tween::default());
        self.app_handle.emit(TTS_EVENT_NAME, TtsEvent::Paused { id: self.sound_id.clone() }).unwrap();
    }

    pub fn stop(self)
    {
        self.handle.lock().unwrap().stop(Tween::default());
        *self.running.lock().unwrap() = false; // thread should be stopping
        self.thread_handle.join().unwrap();
        
        self.app_handle.emit(TTS_EVENT_NAME, TtsEvent::Stopped { id: self.sound_id.clone() }).unwrap();
    }
}

enum TtsSoundData
{
    Generating,
    Generated(StaticSoundData)
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "type")]
pub enum TtsEvent 
{
    Generated
    {
        id: String
    },
    Set 
    {
        id: String,
    },
    Played 
    {
        id: String,
    },
    Playing 
    {
        id: String,
        elapsed: f32,
        duration: f32,
    },
    Paused
    {
        id: String,
    },
    Stopped
    {
        id: String,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TtsRequest
{
    pub id: String,
    pub generating: bool,
}

pub struct TtsPlayer
{
    manager: AudioManager::<DefaultBackend>,
    synthesizer: Arc<Mutex<PiperSpeechSynthesizer>>,
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
        let tts_dir = resolver.resolve("resources/tts-data/espeak-ng-data", BaseDirectory::Resource).unwrap();
        let config_path = resolver.resolve("resources/tts-data/voices/en_US-joe-medium.onnx.json", BaseDirectory::Resource).unwrap();
        std::env::set_var("PIPER_ESPEAKNG_DATA_DIRECTORY", tts_dir.into_os_string());
        let model = piper_rs::from_config_path(config_path.as_path()).unwrap();
        let synth = PiperSpeechSynthesizer::new(model).unwrap();

        let manager = AudioManager::<DefaultBackend>::new(AudioManagerSettings::default()).unwrap();

        Self 
        {
            manager,
            synthesizer: Arc::new(Mutex::new(synth)),
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
                let synthesized: Vec<f32> = synth.lock().unwrap().synthesize_parallel(text, None).unwrap()
                    .into_iter()
                    .map(|r| r.unwrap().into_vec())
                    .flatten()
                    .collect();
            
                let frames: Arc<[Frame]> = synthesized.iter().map(|f| Frame::from_mono(*f)).collect();
                let source = StaticSoundData {
                    sample_rate: 22050,
                    frames,
                    settings: StaticSoundSettings::new(),
                    slice: None,
                };

                sources.lock().unwrap().insert(id_inner.clone(), TtsSoundData::Generated(source));
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
            self.player = Some(TtsPlayerThread::new(&mut self.manager, self.app_handle.clone(), sound_data.clone(), id.clone()));
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
}

#[tauri::command(rename_all = "snake_case")]
pub fn run_tts_command(state: State<'_, Mutex<TtsPlayer>>, command: &str, args: Option<String>) -> Option<String>
{
    println!("got here!: {command}");
    let args: Option<serde_json::Value> = args.map(|a| serde_json::from_str(&a).unwrap());
    match command 
    {
        "request" => {
            if args.as_ref().is_some() && args.as_ref().unwrap().is_string() // make sure args are correct
            {
                let text = args.unwrap().as_str().unwrap().to_owned();

                let request = state.lock().unwrap().request_tts(text.to_owned());
                let request_str = serde_json::to_string(&request).unwrap();
                return Some(request_str);
            }
            else 
            {
                println!("Error: Incorrect arguments for `request` tts command");
            }
        },
        "set" => {
            if args.as_ref().is_some() && args.as_ref().unwrap().is_string() // make sure args are correct
            {
                let id = args.unwrap().as_str().unwrap().to_owned();
                
                state.lock().unwrap().set(&id);
            }
            else 
            {
                println!("Error: Incorrect arguments for `set` tts command");
            }
        },
        "play" => state.lock().unwrap().play(),
        "pause" => state.lock().unwrap().pause(),
        "stop" => state.lock().unwrap().stop(),
        _ => println!("Error: Unknown Command")
    }

    None
}