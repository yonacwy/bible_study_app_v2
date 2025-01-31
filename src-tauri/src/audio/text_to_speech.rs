use tts::*;

pub fn test() -> Result<Tts, Error>
{
    let mut tts = Tts::default()?;
    tts.speak("Here is some text", true)?;

    Ok(tts)
}