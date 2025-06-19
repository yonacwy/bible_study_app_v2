use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{app_state::{ViewState, DEFAULT_BIBLE}, audio::{reader_behavior::ReaderBehavior, TtsSettings}, bible::ChapterIndex, migration::{self, MigrationResult, SaveVersion, CURRENT_SAVE_VERSION}, notes::Notebook, settings::Settings};


#[derive(Serialize, Deserialize)]
pub struct AppSave {
    pub current_bible_version: String,
    pub notebooks: HashMap<String, Notebook>,
    pub save_version: SaveVersion,
    pub view_state_index: usize,
    pub view_states: Vec<ViewState>,
    pub editing_note: Option<String>,
    pub settings: Settings,
    pub selected_reading: u32,
    pub tts_settings: TtsSettings,
    pub reader_behavior: ReaderBehavior,
    pub recent_highlights: Vec<Uuid>,
}

impl AppSave
{
    pub fn load(json: &str) -> (AppSave, bool) 
    {
        let (migrated_json, was_migrated) = match migration::migrate_save_latest(json) {
            MigrationResult::Same(str) => (str, false),
            MigrationResult::Different {
                start,
                end,
                migrated,
            } => {
                println!("Migrated from {:?} to {:?}", start, end);
                (migrated, true)
            }
            MigrationResult::Error(err) => panic!("Error on save | {}", err),
        };
        (serde_json::from_str(&migrated_json).unwrap(), was_migrated)
    }
    
    pub fn get_sync_data(&self) -> CloudSyncData
    {
        CloudSyncData { 
            notebooks: self.notebooks.clone(), 
            save_version: self.save_version.clone() 
        }
    }
}

impl Default for AppSave
{
    fn default() -> Self 
    {
        let chapter = ChapterIndex { book: 0, number: 0 };
        let view_states = vec![ViewState::Chapter {
            chapter,
            verse_range: None,
            scroll: 0.0,
        }];
        
        Self {
            notebooks: HashMap::new(),
            current_bible_version: DEFAULT_BIBLE.to_owned(),
            save_version: CURRENT_SAVE_VERSION,
            view_state_index: 0,
            view_states,
            editing_note: None,
            settings: Settings::default(),
            selected_reading: 0,
            tts_settings: TtsSettings::default(),
            reader_behavior: ReaderBehavior::default(),
            recent_highlights: vec![],
        }
    }
}

// Synced data stored in the cloud
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CloudSyncData
{
    pub notebooks: HashMap<String, Notebook>,
    pub save_version: SaveVersion,
}