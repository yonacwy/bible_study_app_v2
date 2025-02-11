use std::{collections::HashMap, sync::{Arc, Mutex}, thread::{spawn, JoinHandle}};

use kira::{sound::{static_sound::{StaticSoundData, StaticSoundHandle, StaticSoundSettings}, PlaybackState}, AudioManager, AudioManagerSettings, DefaultBackend, Frame, Tween};
use piper_rs::synth::PiperSpeechSynthesizer;
use serde::{Deserialize, Serialize};
use tauri::{path::{BaseDirectory, PathResolver}, AppHandle, Emitter, Runtime, State};

enum TtsSoundSource
{
    Generating(JoinHandle<StaticSoundData>),
    Generated
    {
        data: StaticSoundData,
        id: String,
    }
}

enum TtsPlayerThread
{
    Inactive,
    Playing
    {
        thread: JoinHandle<()>,
        sound_handle: StaticSoundHandle,
    },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "type")]
pub enum TtsEvent 
{
    Generating 
    {
        id: String 
    },
    Ready
    {
        id: String 
    },
    Played 
    {
        id: String,
    },
    Playing 
    {
        id: String,
        time: f32,
        
    }
}

pub struct TtsPlayer
{
    manager: AudioManager::<DefaultBackend>,
    sources: HashMap<String, TtsSoundSource>,
    synthesizer: Arc<Mutex<PiperSpeechSynthesizer>>,
    player_thread: Arc<Mutex<TtsPlayerThread>>,
    app_handle: AppHandle,
}

impl TtsPlayer 
{
    pub fn new<R>(resolver: &PathResolver<R>, app_handle: AppHandle) -> Self
        where R : Runtime
    {
        let tts_dir = resolver.resolve("resources/tts-data/espeak-ng-data", BaseDirectory::Resource).unwrap();
        std::env::set_var("PIPER_ESPEAKNG_DATA_DIRECTORY", tts_dir.into_os_string());
        let config_path = resolver.resolve("resources/tts-data/voices/en_US-joe-medium.onnx.json", BaseDirectory::Resource).unwrap();
        let model = piper_rs::from_config_path(config_path.as_path()).unwrap();
        let synth = PiperSpeechSynthesizer::new(model).unwrap();

        let manager = AudioManager::<DefaultBackend>::new(AudioManagerSettings::default()).unwrap();

        Self 
        {
            manager,
            sources: HashMap::new(),
            synthesizer: Arc::new(Mutex::new(synth)),
            player_thread: TtsPlayerThread::Inactive,
            app_handle,
        }
    }

    pub fn play_text(&mut self, text: String)
    {
        self.stop();
        if let Some(TtsSoundSource::Generated(data)) = self.sources.get(&text) 
        {
            let mut handle = self.manager.play(data.clone()).unwrap();
            handle.pause(Tween::default());
            self.player_thread = TtsPlayerThread::Playing { 
                thread: (), 
                sound_handle: () 
            };
        }
        else 
        {
            self.generate_sound_data(text);    
        }
    }

    fn generate_sound_data(&mut self, text: String)
    {
        let app_handle = self.app_handle.clone();
        let synth = self.synthesizer.clone();
        let key = text.clone();

        let handle = spawn(move || {
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

            source

        });

        self.sources.insert(key, TtsSoundSource::Generating(handle));
    }

    pub fn stop(&mut self)
    {
        
    }

    pub fn pause(&mut self)
    {
        
    }
    
    pub fn resume(&mut self)
    {
        
    }

    pub fn set_time(&mut self, time: f32)
    {
        
    }
}

#[tauri::command(rename_all = "snake_case")]
pub fn run_tts_command(state: State<'_, Mutex<TtsPlayer>>, app_handle: AppHandle, command: &str, args: Option<String>) -> Option<String>
{
    println!("got here!: {command}");
    let args: Option<serde_json::Value> = args.map(|a| serde_json::from_str(&a).unwrap());
    match command 
    {
        _ => {}
    }

    None
}