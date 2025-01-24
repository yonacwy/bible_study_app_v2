use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::{app_state::DEFAULT_BIBLE, settings::Settings};

const SAVE_FIELD_NAME: &str = "save_version";
pub const CURRENT_SAVE_VERSION: SaveVersion = SaveVersion::SV4;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SaveVersion {
    #[serde(rename = "0")]
    SV0,
    #[serde(rename = "1")]
    SV1,
    #[serde(rename = "2")]
    SV2,
    #[serde(rename = "3")]
    SV3,
    #[serde(rename = "4")]
    SV4,
}

impl SaveVersion {
    pub fn check_save(save: &Value) -> Result<SaveVersion, String> {
        match save.get(SAVE_FIELD_NAME) {
            Some(save_version) => match serde_json::from_value(save_version.clone()) {
                Ok(ok) => Ok(ok),
                Err(err) => Err(err.to_string()),
            },
            None => Ok(SaveVersion::SV0),
        }
    }
}

pub enum MigrationResult {
    Same(String),
    Different {
        start: SaveVersion,
        end: SaveVersion,
        migrated: String,
    },
    Error(String),
}

pub fn migrate_save_latest(data: &str) -> MigrationResult {
    let mut json: Value = match serde_json::from_str(data) {
        Ok(ok) => ok,
        Err(err) => return MigrationResult::Error(err.to_string()),
    };

    let version = match SaveVersion::check_save(&json) {
        Ok(ok) => ok,
        Err(err) => return MigrationResult::Error(err),
    };

    migrate_sv0(version, &mut json);
    migrate_sv1(&mut json);
    migrate_sv2(&mut json);
    migrate_sv3(&mut json);

    if CURRENT_SAVE_VERSION != version {
        MigrationResult::Different {
            start: version,
            end: CURRENT_SAVE_VERSION,
            migrated: serde_json::to_string(&json).unwrap(),
        }
    } else {
        MigrationResult::Same(serde_json::to_string(&json).unwrap())
    }
}

fn migrate_sv0(version: SaveVersion, json: &mut Value) 
{
    if version != SaveVersion::SV0 { return; }

    if json.get(SAVE_FIELD_NAME).is_none() 
    {
        let obj = json.as_object_mut().unwrap();
        obj.insert(
            SAVE_FIELD_NAME.to_owned(),
            serde_json::to_value(SaveVersion::SV1).unwrap(),
        );
    }

    // fixes the category renaming thing
    const NOTEBOOK_PATH: &str = "notebook";
    const OLD_CATEGORY_PATH: &str = "highlight_catagories";
    const NEW_CATEGORY_PATH: &str = "highlight_categories";

    if let Some(notebook) = json.get_mut(NOTEBOOK_PATH).and_then(|n| n.as_object_mut())
    {
        if notebook.contains_key(OLD_CATEGORY_PATH)
        {
            let data = notebook.get(OLD_CATEGORY_PATH).unwrap().clone();
            notebook.remove(OLD_CATEGORY_PATH);
            notebook.insert(NEW_CATEGORY_PATH.into(), data);
        }
    }
}

/// The save version must be in SV1 format.
/// Just adds the `settings` value to the save file
fn migrate_sv1(json: &mut Value)
{
    if !json.get(SAVE_FIELD_NAME)
       .and_then(|v| serde_json::from_value(v.clone()).ok())
       .is_some_and(|v: SaveVersion| v == SaveVersion::SV1)
    {
        return;
    }

    const SETTINGS_NAME: &str = "settings";
    let json_obj = json.as_object_mut().unwrap();
    json_obj.insert(SAVE_FIELD_NAME.into(), serde_json::to_value(SaveVersion::SV2).unwrap());
    json_obj.insert(SETTINGS_NAME.into(), serde_json::to_value(Settings::default()).unwrap());
}

/// The save version must be in SV1 format.
/// Just adds the `selected_reading` value to the save file
fn migrate_sv2(json: &mut Value)
{
    if !json.get(SAVE_FIELD_NAME)
       .and_then(|v| serde_json::from_value(v.clone()).ok())
       .is_some_and(|v: SaveVersion| v == SaveVersion::SV2)
    {
        return;
    }

    const SELECTED_READING_NAME: &str = "selected_reading";
    let json_obj = json.as_object_mut().unwrap();
    json_obj.insert(SAVE_FIELD_NAME.into(), serde_json::to_value(SaveVersion::SV3).unwrap());
    json_obj.insert(SELECTED_READING_NAME.into(), serde_json::to_value(0u32).unwrap());
}

fn migrate_sv3(json: &mut Value)
{
    if !check_save_field(json, SaveVersion::SV3) { return; }

    let json = json.as_object_mut().unwrap();

    // Loading the notebooks
    {
        const NOTEBOOK_FIELD_NAME: &str = "notebook";
        const NOTEBOOKS_FIELD_NAME: &str = "notebooks";
        let notebook = json.remove(NOTEBOOK_FIELD_NAME).unwrap();
        
        let mut notebooks = HashMap::new();
        notebooks.insert(DEFAULT_BIBLE.to_owned(), notebook);
        let notebooks = serde_json::to_value(notebooks).unwrap();

        json.insert(NOTEBOOKS_FIELD_NAME.to_owned(), notebooks);
    }

    {
        // sets the current bible version
        const CURRENT_BIBLE_VERSION_FIELD: &str = "current_bible_version";
        json.insert(CURRENT_BIBLE_VERSION_FIELD.to_owned(), Value::String(DEFAULT_BIBLE.to_owned()));
    }

    json.insert(SAVE_FIELD_NAME.to_owned(), serde_json::to_value(SaveVersion::SV4).unwrap());
}

fn check_save_field(json: &mut Value, expected: SaveVersion) -> bool
{
    json.get(SAVE_FIELD_NAME)
       .and_then(|v| serde_json::from_value(v.clone()).ok())
       .is_some_and(|v: SaveVersion| v == expected)
}
