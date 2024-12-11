use serde::{Deserialize, Serialize};
use serde_json::Value;

const SAVE_FIELD_NAME: &str = "save_version";
pub const CURRENT_SAVE_VERSION: SaveVersion = SaveVersion::SV1;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SaveVersion {
    #[serde(rename = "0")]
    SV0,
    #[serde(rename = "1")]
    SV1,
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
