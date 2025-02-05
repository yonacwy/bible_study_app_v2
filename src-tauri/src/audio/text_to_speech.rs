use std::{sync::{Arc, Mutex}, thread::{spawn, JoinHandle}};

use kira::{sound::{static_sound::{StaticSoundData, StaticSoundHandle}, PlaybackState}, AudioManager, AudioManagerSettings, DefaultBackend, Tween};
use tauri::{path::{BaseDirectory, PathResolver}, AppHandle, Runtime, State};

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
            handle.join();
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
}

#[tauri::command(rename_all = "snake_case")]
pub fn speak_text(state: State<'_, Mutex<TtsPlayer>>)
{
    state.lock().unwrap().play();
}