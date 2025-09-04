use std::sync::Arc;

use anyhow::Result;
use kira::{sound::static_sound::{StaticSoundData, StaticSoundSettings}, Frame};
use piper_rs::{synth::PiperSpeechSynthesizer, PiperError};
use tauri::{path::{BaseDirectory, PathResolver}, Runtime};

use super::TTS_SAMPLE_RATE;

pub struct SpeechSynth(PiperSpeechSynthesizer);

impl SpeechSynth
{
    pub fn new<R>(resolver: &PathResolver<R>) -> Result<Self>
        where R : Runtime
    {
        let config_path = resolver.resolve("resources/tts-data/voices/en_US-joe-medium.onnx.json", BaseDirectory::Resource)?;
        let model = piper_rs::from_config_path(config_path.as_path())?;
        let synth = PiperSpeechSynthesizer::new(model)?;

        Ok(Self(synth))
    }

    pub fn synth_text_to_frames(&self, text: String) -> Result<Vec<Frame>>
    {
        let frames = self.0.synthesize_parallel(text, None)?
            .into_iter()
            .map(|r| r.map(|r| r.into_vec()))
            .collect::<std::result::Result<Vec<Vec<f32>>, PiperError>>()?
            .into_iter()
            .flatten()
            .map(Frame::from_mono)
            .collect();
        Ok(frames)
    }

    pub fn synth_text(&self, text: String) -> Result<StaticSoundData>
    {
        let synthesized: Vec<f32> = self.0.synthesize_parallel(text, None)?
            .into_iter()
            .map(|r| r.map(|r| r.into_vec()))
            .collect::<std::result::Result<Vec<Vec<f32>>, PiperError>>()?
            .into_iter()
            .flatten()
            .collect();
    
        let frames: Arc<[Frame]> = synthesized.iter().map(|f| Frame::from_mono(*f)).collect();
        
        Ok(StaticSoundData {
            sample_rate: TTS_SAMPLE_RATE,
            frames,
            settings: StaticSoundSettings::new(),
            slice: None,
        })
    }
}