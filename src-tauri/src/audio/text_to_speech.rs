use std::{sync::{Arc, Mutex}, thread::{spawn, JoinHandle}};

use kira::{sound::{static_sound::{StaticSoundData, StaticSoundHandle}, PlaybackState}, AudioManager, AudioManagerSettings, DefaultBackend, Tween};
use tauri::{path::{BaseDirectory, PathResolver}, Runtime, State};

pub struct TtsPlayer
{
    manager: AudioManager::<DefaultBackend>,
    source: StaticSoundData,
    sound_handle: Option<Arc<Mutex<StaticSoundHandle>>>,
    player_thread: Option<JoinHandle<()>>,
}

impl TtsPlayer 
{
    pub fn new<R>(resolver: &PathResolver<R>) -> Self
        where R : Runtime
    {
        let manager = AudioManager::<DefaultBackend>::new(AudioManagerSettings::default()).unwrap();
        let r = resolver.resolve("resources/sounds/sample-wav-files-sample3.wav", BaseDirectory::Resource).unwrap();
        let source = StaticSoundData::from_file(r).unwrap();

        Self 
        {
            manager,
            source,
            sound_handle: None,
            player_thread: None,
        }
    }

    pub fn play(&mut self)
    {
        // if we are still playing, we stop the player thread
        if let Some(handle) = self.player_thread.take()
        {
            self.sound_handle.take().unwrap().lock().unwrap().stop(Tween::default());
            handle.join().unwrap();
        }

        let duration = self.source.duration().as_secs_f32();
        
        let sound_handle = self.manager.play(self.source.clone()).unwrap();
        let sound_handle = Arc::new(Mutex::new(sound_handle));
        self.sound_handle = Some(sound_handle.clone());

        self.player_thread = Some(spawn(move || {
            let mut old_elapsed = 0.0;
            loop 
            {
                let elapsed = sound_handle.lock().unwrap().position() as f32;

                match sound_handle.lock().unwrap().state()
                {
                    PlaybackState::Playing => {
                        if elapsed - old_elapsed > 0.05
                        {
                            old_elapsed = elapsed;
                            let progress = (elapsed / duration) * 100.0;
                            println!("time: {:.2}%", progress);
                        }
                    },
                    PlaybackState::Stopped => break,
                    _ => {}
                }
            }
        }))
    }

    pub fn stop(&mut self)
    {
        if let Some(handle) = &self.sound_handle
        {
            handle.lock().unwrap().stop(Tween::default());
        }
    }
    
    pub fn get_state(&mut self) -> PlaybackState
    {
        self.sound_handle.as_ref().map_or(PlaybackState::Stopped, |h| h.lock().unwrap().state())
    }

    pub fn pause(&mut self)
    {
        if let Some(handle) = &self.sound_handle
        {
            handle.lock().unwrap().pause(Tween::default());
        }
    }
    
    pub fn resume(&mut self)
    {
        if let Some(handle) = &self.sound_handle
        {
            handle.lock().unwrap().resume(Tween::default());
        }
    }
}

#[tauri::command(rename_all = "snake_case")]
pub fn run_tts_command(state: State<'_, Mutex<TtsPlayer>>, command: &str) -> Option<String>
{
    match command 
    {
        "play" => state.lock().unwrap().play(),
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
        _ => println!("Error: Unknown TTS command")
    }

    None
}