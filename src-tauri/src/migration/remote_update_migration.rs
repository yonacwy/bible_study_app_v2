use std::{collections::HashMap, time::SystemTime};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

use crate::bible::{Bible, ChapterIndex};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct OldFormat {
    pub current_bible_version: String,
    pub notebooks: HashMap<String, Notebook>,
    pub save_version: String,
    pub view_state_index: u32,
    pub view_states: Vec<ViewState>,
    pub editing_note: Option<String>,
    pub settings: Settings,
    pub selected_reading: u32,
    pub tts_settings: TtsSettings,
    pub reader_behavior: ReaderBehavior,
    pub recent_highlights: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct NewFormat {
    pub note_record_saves: Vec<NoteRecordSave>,
    pub local_device_save: LocalDeviceSave,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct NoteRecordSave {
    pub history: History,
    pub save_version: String,
    pub owner_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct History {
    pub groups: Vec<ActionGroup>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ActionGroup {
    pub id: String,
    pub actions: Vec<Action>,
    pub time: SystemTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Action {
    pub notebook: String,
    pub bible_name: String,
    pub action: ActionType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
enum ActionType {
    CreateHighlight(CreateHighlightAction),
    Highlight(HighlightAction),
    CreateNote(CreateNoteAction),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreateHighlightAction {
    pub color: Color,
    pub name: String,
    pub description: String,
    pub source_type: String,
    pub priority: u32,
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct HighlightAction {
    pub highlight_id: String,
    pub location: Location,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreateNoteAction {
    pub id: String,
    pub text: String,
    pub locations: Vec<Location>,
    pub source_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct EditNoteAction {
    pub id: String,
    pub text: String,
    pub locations: Vec<Location>,
    pub source_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Color {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LocalDeviceSave {
    pub save_version: String,
    pub current_bible_version: String,
    pub view_state_index: u32,
    pub view_states: Vec<ViewState>,
    pub editing_note: Option<String>,
    pub settings: Settings,
    pub selected_reading: u32,
    pub tts_settings: TtsSettings,
    pub reader_behavior: ReaderBehavior,
    pub recent_highlights: Vec<String>,
    pub cloud_sync_save: CloudSyncSave,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CloudSyncSave {
    pub refresh_token: Option<String>,
    pub can_ask_enable_sync: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Notebook {
    pub highlight_categories: HashMap<String, Value>,
    pub notes: HashMap<String, Note>,
    pub favorite_verses: Vec<Value>,
    pub section_headings: Vec<Value>,
    pub annotations: Vec<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Note {
    pub id: String,
    pub text: String,
    pub locations: Vec<Location>,
    pub source_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Location {
    pub chapter: Chapter,
    pub range: Range,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Chapter {
    pub book: u32,
    pub number: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Range {
    pub verse_start: u32,
    pub word_start: u32,
    pub verse_end: u32,
    pub word_end: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ViewState {
    #[serde(rename = "type")]
    pub view_type: String,
    pub chapter: Chapter,
    pub verse_range: Option<VerseRange>,
    pub scroll: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct VerseRange {
    pub start: u32,
    pub end: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Settings {
    pub volume: f64,
    pub ui_scale: f64,
    pub font: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TtsSettings {
    pub volume: f64,
    pub playback_speed: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ReaderBehavior {
    #[serde(rename = "type")]
    pub behavior_type: String,
    pub data: Value,
}

pub struct RemoteJsonConverter;

impl RemoteJsonConverter 
{
    /// Convert from the old format to the new format
    pub fn convert_to_new_format(old_data: &Value, bibles: &HashMap<String, impl AsRef<Bible>>) -> Result<Value, Box<dyn std::error::Error>> 
    {
        let new_format = Self::build_new_format(&old_data, bibles)?;
        let json = serde_json::to_value(&new_format)?;
        Ok(json)
    }
    
    fn build_new_format(old_format: &Value, bibles: &HashMap<String, impl AsRef<Bible>>) -> Result<NewFormat, Box<dyn std::error::Error>> 
    {
        let current_bible_version = old_format
            .get("current_bible_version")
            .and_then(|v| v.as_str())
            .unwrap_or("KJV")
            .to_string();
        
        // Create note record saves based on existing data
        let note_record_saves = Self::create_note_record_saves(old_format, bibles)?;
        
        // Create local device save
        let local_device_save = Self::create_local_device_save(old_format, &current_bible_version)?;
        
        Ok(NewFormat {
            note_record_saves,
            local_device_save,
        })
    }
    
    fn create_note_record_saves(old_format: &Value, bibles: &HashMap<String, impl AsRef<Bible>>) -> Result<Vec<NoteRecordSave>, Box<dyn std::error::Error>> 
    {
        let mut saves = vec![
            // Empty initial save
            NoteRecordSave {
                history: History { groups: vec![] },
                save_version: "0".to_string(),
                owner_id: None,
            }
        ];
        
        // Create a save with all the data converted to actions
        let mut actions = Vec::new();
        
        // Convert existing data to actions
        if let Some(notebooks) = old_format.get("notebooks").and_then(|n| n.as_object()) {
            for (bible_name, notebook) in notebooks {
                // Convert existing highlight categories to CreateHighlight actions

                let bible = bibles.get(bible_name).unwrap();

                if let Some(highlight_categories) = notebook.get("highlight_categories").and_then(|h| h.as_object()) {
                    for (category_id, category_data) in highlight_categories {
                        if let Ok(category_obj) = category_data.as_object().ok_or("Invalid category object") {
                            let color = if let Some(color_obj) = category_obj.get("color").and_then(|c| c.as_object()) {
                                Color {
                                    r: color_obj.get("r").and_then(|v| v.as_u64()).unwrap_or(0) as u8,
                                    g: color_obj.get("g").and_then(|v| v.as_u64()).unwrap_or(0) as u8,
                                    b: color_obj.get("b").and_then(|v| v.as_u64()).unwrap_or(0) as u8,
                                }
                            } else {
                                Color { r: 255, g: 255, b: 0 } // Default to yellow if no color
                            };
                            
                            actions.push(Action {
                                notebook: bible_name.clone(),
                                bible_name: bible_name.clone(),
                                action: ActionType::CreateHighlight(CreateHighlightAction {
                                    color,
                                    name: category_obj.get("name")
                                        .and_then(|v| v.as_str())
                                        .unwrap()
                                        .to_string(),
                                    description: category_obj.get("description")
                                        .and_then(|v| v.as_str())
                                        .unwrap()
                                        .to_string(),
                                    source_type: category_obj.get("source_type")
                                        .and_then(|v| v.as_str())
                                        .unwrap()
                                        .to_string(),
                                    priority: category_obj.get("priority")
                                        .and_then(|v| v.as_u64())
                                        .unwrap_or(5) as u32,
                                    id: category_id.clone()
                                }),
                            });
                        }
                    }
                }
                
                // Convert existing notes to actions
                if let Some(notes) = notebook.get("notes").and_then(|n| n.as_object()) 
                {
                    for (_, note_data) in notes {
                        if let Ok(note) = serde_json::from_value::<Note>(note_data.clone()) 
                        {
                            // Create note action
                            actions.push(Action {
                                notebook: bible_name.clone(),
                                bible_name: bible_name.clone(),
                                action: ActionType::CreateNote(CreateNoteAction {
                                    id: note.id.clone(),
                                    text: note.text,
                                    locations: note.locations.clone(),
                                    source_type: note.source_type.clone(),
                                }),
                            });
                        }
                    }
                }
                
                // Convert existing highlights (actual highlighted text) to Highlight actions
                if let Some(annotations) = notebook.get("annotations").and_then(|a| a.as_array()) 
                {
                    for annotation in annotations 
                    {
                        if let Some(annotation_array) = annotation.as_array() 
                        {
                            if annotation_array.len() >= 2 
                            {
                                let chapter_data = &annotation_array[0];
                                let highlights_data = &annotation_array[1];
                                
                                if let (Some(chapter_obj), Some(highlights_obj)) = 
                                    (chapter_data.as_object(), highlights_data.as_object()) 
                                {
                                    
                                    let chapter = Chapter {
                                        book: chapter_obj.get("book").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
                                        number: chapter_obj.get("number").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
                                    };

                                    let view = bible.as_ref().get_chapter(ChapterIndex {
                                        book: chapter.book,
                                        number: chapter.number
                                    }).get_view();
                                    
                                    for (word_id, word_data) in highlights_obj 
                                    {
                                        if let Some(word_obj) = word_data.as_object() 
                                        {
                                            if let Some(highlights_array) = word_obj.get("highlights").and_then(|h| h.as_array()) 
                                            {
                                                for highlight_id in highlights_array 
                                                {
                                                    if let Some(highlight_id_str) = highlight_id.as_str() 
                                                    {
                                                        let (verse_index, word_index) = view.expand_word_index(word_id.parse().unwrap_or(0));
                                                        actions.push(Action {
                                                            notebook: bible_name.clone(),
                                                            bible_name: bible_name.clone(),
                                                            action: ActionType::Highlight(HighlightAction {
                                                                highlight_id: highlight_id_str.to_string(),
                                                                location: Location {
                                                                    chapter: chapter.clone(),
                                                                    range: Range {
                                                                        verse_start: verse_index,
                                                                        word_start: word_index,
                                                                        verse_end: verse_index,
                                                                        word_end: word_index,
                                                                    },
                                                                },
                                                            }),
                                                        });
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        if !actions.is_empty() 
        {
            saves.push(NoteRecordSave {
                history: History {
                    groups: vec![ActionGroup {
                        id: Uuid::new_v4().to_string(),
                        actions,
                        time: SystemTime::now(),
                    }],
                },
                save_version: "0".to_string(),
                owner_id: None, // Default owner ID
            });
        }
        
        Ok(saves)
    }
    
    fn create_local_device_save(old_format: &Value, current_bible: &str) -> Result<LocalDeviceSave, Box<dyn std::error::Error>> 
    {
        Ok(LocalDeviceSave {
            save_version: "0".to_string(),
            current_bible_version: current_bible.to_string(),
            view_state_index: old_format
                .get("view_state_index")
                .and_then(|v| v.as_u64())
                .unwrap_or(0) as u32,
            view_states: old_format
                .get("view_states")
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .unwrap_or_default(),
            editing_note: old_format
                .get("editing_note")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            settings: old_format
                .get("settings")
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .unwrap_or(Settings {
                    volume: 0.0,
                    ui_scale: 1.0,
                    font: None,
                }),
            selected_reading: old_format
                .get("selected_reading")
                .and_then(|v| v.as_u64())
                .unwrap_or(0) as u32,
            tts_settings: old_format
                .get("tts_settings")
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .unwrap_or(TtsSettings {
                    volume: 1.0,
                    playback_speed: 1.0,
                }),
            reader_behavior: old_format
                .get("reader_behavior")
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .unwrap_or(ReaderBehavior {
                    behavior_type: "single".to_string(),
                    data: serde_json::json!({
                        "options": {
                            "type": "no_repeat"
                        }
                    }),
                }),
            recent_highlights: old_format
                .get("recent_highlights")
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .unwrap_or_default(),
            cloud_sync_save: CloudSyncSave { 
                refresh_token: None, 
                can_ask_enable_sync: true,
            },
        })
    }
}