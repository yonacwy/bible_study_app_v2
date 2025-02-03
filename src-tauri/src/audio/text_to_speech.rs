use std::sync::{Arc, Mutex};

use tts::*;

pub struct AppTts
{
    tts: Arc<Mutex<Tts>>
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
        self.tts.lock().unwrap().speak(text, true);
    }
}

pub fn test() -> Result<Tts, Error>
{
    let mut tts = Tts::default()?;
    tts.speak("Here is some text", true)?;

    Ok(tts)
}