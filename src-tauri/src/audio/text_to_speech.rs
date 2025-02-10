use std::{collections::HashMap, sync::{Arc, Mutex}, thread::{spawn, JoinHandle}};

use kira::{sound::{static_sound::{StaticSoundData, StaticSoundHandle, StaticSoundSettings}, PlaybackState}, AudioManager, AudioManagerSettings, DefaultBackend, Frame, Tween};
use piper_rs::synth::PiperSpeechSynthesizer;
use tauri::{path::{BaseDirectory, PathResolver}, AppHandle, Emitter, Runtime, State};

enum TtsSoundSource
{
    Generating(JoinHandle<StaticSoundData>),
    Generated(StaticSoundData)
}

pub struct TtsPlayer
{
    manager: AudioManager::<DefaultBackend>,
    sources: HashMap<String, TtsSoundSource>,
    synthesizer: Arc<Mutex<PiperSpeechSynthesizer>>,
    sound_handle: Option<StaticSoundHandle>,
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
            sound_handle: None,
            app_handle,
        }
    }

    pub fn play_text(&mut self, text: String) -> bool
    {
        self.stop();
        if let Some(data) = self.
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

            app_handle.emit();
            source

        });

        self.sources.insert(key, TtsSoundSource::Generating(handle));
    }

    pub fn stop(&mut self)
    {
        self.thread_handle.stop();
    }

    pub fn pause(&mut self)
    {
        
    }
    
    pub fn resume(&mut self)
    {
        
    }

    pub fn get_duration(&mut self) -> f32
    {
        
    }

    pub fn set_time(&mut self, time: f32)
    {
        if let Some(handle) = &self.sound_handle
        {
            handle.lock().unwrap().seek_to(time as f64);
        }
    }
}

#[tauri::command(rename_all = "snake_case")]
pub fn run_tts_command(state: State<'_, Mutex<TtsPlayer>>, app_handle: AppHandle, command: &str, args: Option<String>) -> Option<String>
{
    println!("got here!: {command}");
    let args: Option<serde_json::Value> = args.map(|a| serde_json::from_str(&a).unwrap());
    match command 
    {
        "play" => state.lock().unwrap().play_text(app_handle),
        "pause" => state.lock().unwrap().pause(),
        "resume" => state.lock().unwrap().resume(),
        "stop" => state.lock().unwrap().stop(),
        "get_state" => {
            let value = match state.lock().unwrap().get_state()
            {
                PlaybackState::Playing => "playing",
                PlaybackState::Pausing => "pausing",
                PlaybackState::Paused => "paused",
                PlaybackState::WaitingToResume => "waiting_to_resume",
                PlaybackState::Resuming => "resuming",
                PlaybackState::Stopping => "stopping",
                PlaybackState::Stopped => "stopped",
            }.to_owned();

            return Some(value)
        }
        "get_duration" => return Some(state.lock().unwrap().get_duration().to_string()),
        "set_time" => {
            let Some(value) = args.map(|a| a.as_f64()).flatten().map(|v| v as f32) else {
                println!("Error: invalid `set_time` command argument");
                return None;
            };

            state.lock().unwrap().set_time(value);
        },
        _ => println!("Error: Unknown TTS command")
    }

    None
}