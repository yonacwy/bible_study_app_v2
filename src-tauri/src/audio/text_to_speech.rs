use std::sync::{Arc, Mutex};

use tts::*;

pub struct AppTts
{
    tts: Arc<Mutex<Tts>>,
}

impl AppTts
{
    pub fn new() -> Result<Self, String>
    {
        let tts = match Tts::default()
        {
            Ok(ok) => ok,
            Err(err) => return Err(err.to_string())
        };

        Ok(Self {
            tts: Arc::new(Mutex::new(tts))
        })
    }

    pub fn speak(&self, text: &str)
    {
        self.tts.lock().unwrap().speak(text, true).unwrap();
    }

    pub fn stop(&self)
    {
        self.tts.lock().unwrap().stop().unwrap();
    }

    pub fn get_voices(&self) -> Option<Vec<String>>
    {
        self.tts.lock().unwrap().voices().ok().map(|voices|  {
            voices.iter().map(|v| v.name()).collect()
        })
    }

    pub fn set_voice(&self)
    {
        todo!()
    }
}

pub enum SpeechEvent
{
    Started,
    Ended,
    Stopped,
}

#[tauri::command(rename_all = "snake_case")]
pub fn speak_text(text: String, speech_id: String)
{
    
}