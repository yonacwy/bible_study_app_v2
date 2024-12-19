use serde::{Deserialize, Serialize};


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings 
{
    pub volume: f32,
    pub text_scale: f32,
    pub ui_scale: f32,
    pub font: Option<String>,
}

impl Default for Settings 
{
    fn default() -> Self 
    {
        Self { 
            volume: 0.5, 
            text_scale: 1.0, 
            ui_scale: 1.0,
            font: None,
        }
    }
}