use std::{sync::{Arc, Mutex}, thread::{spawn, JoinHandle}, time::SystemTime};

use kira::{sound::{static_sound::{StaticSoundData, StaticSoundHandle}, PlaybackState}, AudioManager, DefaultBackend, Tween};
use tauri::{AppHandle, Emitter};
use super::events::*;

pub struct TtsPlayerThread 
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
    pub fn new(manager: Arc<Mutex<AudioManager<DefaultBackend>>>, app_handle: AppHandle, sound_data: StaticSoundData, sound_id: String) -> Self
    {
        // start the handle paused
        let duration = sound_data.duration().as_secs_f32();
        let mut sound_handle = manager.lock().unwrap().play(sound_data.clone()).unwrap();
        sound_handle.pause(Tween::default());
        let sound_handle = Arc::new(Mutex::new(sound_handle));
        let sound_handle_inner = sound_handle.clone();
        let app_handle_inner = app_handle.clone();

        let running = Arc::new(Mutex::new(true));
        let running_inner = running.clone();

        let sound_id_inner = sound_id.clone();

        let thread_handle = spawn(move || {
            const UPDATE_TIME: f32 = 0.05;
            
            let mut time = SystemTime::now();
            while *running_inner.lock().unwrap()
            {
                // make sure we don't constantly play events
                if time.elapsed().unwrap().as_secs_f32() < UPDATE_TIME { continue; }
                time = SystemTime::now();

                let mut sound_handle = sound_handle_inner.lock().unwrap();
                if let PlaybackState::Playing = sound_handle.state()
                {
                    app_handle_inner.emit(TTS_EVENT_NAME, TtsEvent::Playing { 
                        id: sound_id_inner.clone(), 
                        elapsed: sound_handle.position() as f32 / duration, 
                        duration 
                    }).unwrap();
                }

                if let PlaybackState::Stopped = sound_handle.state()
                {
                    *sound_handle = manager.lock().unwrap().play(sound_data.clone()).unwrap();
                    sound_handle.pause(Tween::default());
                    app_handle_inner.emit(TTS_EVENT_NAME, TtsEvent::Finished { 
                        id: sound_id_inner.clone() 
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
            duration,
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
        *self.running.lock().unwrap() = false; // thread should be stopping
        self.thread_handle.join().unwrap();
        self.handle.lock().unwrap().stop(Tween::default()); // need to stop after, so that we can stop the running thread
        
        self.app_handle.emit(TTS_EVENT_NAME, TtsEvent::Stopped { id: self.sound_id.clone() }).unwrap();
    }

    pub fn is_playing(&self) -> bool
    {
        self.handle.lock().unwrap().state() == PlaybackState::Playing
    }

    pub fn get_duration(&self) -> f32 
    {
        self.duration
    }

    pub fn set_time(&self, time: f32)
    {
        self.handle.lock().unwrap().seek_to((time * self.duration) as f64);
    }
}