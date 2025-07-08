use std::thread;

use cloud_sync::{utils::{AppInfo, ClientInfo}, DriveSyncClient};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, State};

use crate::{app_state::{AppState, AppStateHandle}, debug_release_val, notes::action::ActionHistory, prompt::{self, OptionColor, PromptArgs, PromptOption}, save_data::NotebookRecordSave};

const CLIENT_ID: &str = "752728507993-tandjiid9gvavab6g8pa0k1kpirghho6.apps.googleusercontent.com";
const CLIENT_SECRET: &str = "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";
const REDIRECT_URI: &str = "http://localhost:8080";

const APP_ID: &str = "Ascribe.app";
const SYNC_FILE_NAME: &str = debug_release_val! {
    debug: "ascribe_data_debug.json",
    release: "ascribe_data.json"
};

const TIMEOUT_MS: u32 = 2 * 60 * 1000; // 2 minutes

const SUCCESS_PAGE_SRC: &str = include_str!("../../ui/pages/auth/auth.html");
const CANCELLED_PAGE_SRC: &str = include_str!("../../ui/pages/auth/cancelled.html");

#[derive(Debug)]
pub struct CloudSyncState
{
    pub drive_client: Option<DriveSyncClient>,
    pub loading_error: Option<String>,
    pub can_ask_enable_sync: bool,
}

impl CloudSyncState
{
    pub fn get_save(&self) -> CloudSyncStateSave
    {
        let refresh_token = self.drive_client.as_ref().map(|d| d.refresh_token().to_owned());

        CloudSyncStateSave { 
            refresh_token,
            can_ask_enable_sync: self.can_ask_enable_sync,
        }
    }

    pub fn from_save(save: CloudSyncStateSave) -> Self 
    {
        if let Some(refresh_token) = save.refresh_token
        {
            let client = ClientInfo { id: CLIENT_ID.into(), secret: CLIENT_SECRET.into() };
            let app_info = AppInfo { app_id: APP_ID.into(), sync_file_name: SYNC_FILE_NAME.into() };

            match DriveSyncClient::from_refresh_token(client, app_info, refresh_token)
            {
                Ok(ok) => {
                    println!("Successfully refreshed session");
                    Self {
                        drive_client: Some(ok),
                        loading_error: None,
                        can_ask_enable_sync: save.can_ask_enable_sync,
                    }
                },
                Err(e) => {
                    println!("Failed to refreshed session because: {}", e);
                    Self {
                        drive_client: None,
                        loading_error: Some(e),
                        can_ask_enable_sync: save.can_ask_enable_sync,
                    }
                }
            }
        }
        else 
        {
            println!("No refresh token saved");
            Self {
                drive_client: None,
                loading_error: None,
                can_ask_enable_sync: save.can_ask_enable_sync,
            }    
        }
    }

    pub fn read_remote_save(&self) -> Result<Option<RemoteSave>, String>
    {
        let Some(client) = &self.drive_client else {
            return Err("Cannot read from remote when no client is signed in".into());
        };

        let Some(json) = client.read_file()? else {
            return Ok(None);
        };

        let save = serde_json::from_str(&json)
            .map_err(|e| format!("Json error: {}", e))?;
        
        Ok(Some(save))
    }

    pub fn write_remote_save(&self, save: &RemoteSave) -> Result<(), String>
    {
        let Some(client) = &self.drive_client else {
            return Err("Cannot write to remote when no client is signed in".into());
        };

        println!("TODO: check owner id");

        // let user_info = client.get_user_info()?;

        // let Some(save_owner_id) = &save.note_record_save.owner_id else {
        //     return Err("Save must have a owner id to sync".into());
        // };

        // if *save_owner_id != user_info.sub
        // {
        //     return Err(format!("Save id {} is not the same as the user id {}", save.note_record_save.owner_id.as_ref().unwrap(), user_info.sub));
        // }

        let json = if cfg!(debug_assertions)
        {
            serde_json::to_string_pretty(save).unwrap()
        }
        else 
        {
            serde_json::to_string(save).unwrap()
        };
        
        client.write_file(&json)
    }

    pub fn get_owner_id(&self) -> Option<String>
    {
        self.drive_client.as_ref().map(|client| client.user_info().sub.clone())
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CloudSyncStateSave
{
    pub refresh_token: Option<String>,
    pub can_ask_enable_sync: bool,
}

impl Default for CloudSyncStateSave
{
    fn default() -> Self 
    {
        Self 
        { 
            refresh_token: Default::default(), 
            can_ask_enable_sync: true, 
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RemoteSave
{
    pub note_record_save: NotebookRecordSave,
}

pub const CLOUD_EVENT_NAME: &str = "cloud_sync_event";

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum CloudEvent 
{
    SignedIn,
    SigninDenied,
    SigninError {
        message: String,
    },
    SignedOut,
    SignoutError {
        message: String,
    },
    SyncStart,
    SyncEnd {
        error: Option<String>,
    },
}

#[tauri::command(rename_all = "snake_case")]
pub fn run_cloud_command(app_handle: AppHandle, app_state: State<'_, AppState>, command: &str, args: Option<String>) -> Option<String>
{
    let args: Option<Value> = args.map(|a| serde_json::from_str(&a).unwrap());

    match command
    {
        "signin" => {
            let app_ref = app_state.get_ref();
            let sync_state = app_ref.sync_state.try_read().unwrap();
            if sync_state.drive_client.is_some() { return None; } // already signed in
            spawn_signin_thread(app_handle, app_state.get_handle());
            return None;
        },
        "signout" => {
            let app_ref = app_state.get_ref();
            let mut sync_state = app_ref.sync_state.try_write().unwrap();
            if let Some(drive_client) = sync_state.drive_client.take()
            {
                match drive_client.signout()
                {
                    Ok(()) => app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SignedOut).unwrap(),
                    Err(e) => app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SignoutError { 
                        message: e
                    }).unwrap()
                }
            }
        },
        "switch_account" => {
            let app_ref = app_state.get_ref();
            let mut sync_state = app_ref.sync_state.try_write().unwrap();
            if let Some(drive_client) = sync_state.drive_client.take()
            {
                match drive_client.signout()
                {
                    Ok(()) => {
                        drop(sync_state);
                        spawn_signin_thread(app_handle, app_state.get_handle());
                    },
                    Err(e) => app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SignoutError { 
                        message: e
                    }).unwrap()
                }
            }
        },
        "is_signed_in" => {
            let app_ref = app_state.get_ref();
            let sync_state = app_ref.sync_state.try_read().unwrap();
            return Some(serde_json::to_string(&sync_state.drive_client.is_some()).unwrap())
        },
        "account_info" => {
            let app_ref = app_state.get_ref();
            let sync_state = app_ref.sync_state.try_read().unwrap();
            let account = sync_state.drive_client.as_ref()
                .map(|c| c.user_info());

            return Some(serde_json::to_string(&account).unwrap())
        },
        "get_refresh_sync_error" => {
            let app_ref = app_state.get_ref();
            let sync_state = app_ref.sync_state.try_read().unwrap();
            return sync_state.loading_error.clone();
        },
        "set_can_ask_sync" => {
            let app_ref = app_state.get_ref();
            let mut sync_state = app_ref.sync_state.try_write().unwrap();

            if let Some(value) = args.and_then(|arg| serde_json::from_value::<bool>(arg).ok())
            {
                sync_state.can_ask_enable_sync = value;
            }
            else 
            {
                println!("Invalid arguments for `set_can_ask_sync` command");
            }
        },
        "get_can_ask_sync" => {
            let app_ref = app_state.get_ref();
            let sync_state = app_ref.sync_state.try_read().unwrap();
            return Some(serde_json::to_string(&sync_state.can_ask_enable_sync).unwrap());
        },
        "sync_with_cloud" => {
            app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SyncStart).unwrap();
            
            match app_state.get_ref().sync_with_cloud()
            {
                Ok(()) => app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SyncEnd { error: None }),
                Err(e) => app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SyncEnd { error: Some(e) })
            }.unwrap()
        }
        _ => println!("Error: Unknown Command")
    }

    None
}

fn spawn_signin_thread(app_handle: AppHandle, app_state_handle: AppStateHandle)
{
    thread::spawn(move || {
        let client = ClientInfo { id: CLIENT_ID.into(), secret: CLIENT_SECRET.into() };
        let app_info = AppInfo { app_id: APP_ID.into(), sync_file_name: SYNC_FILE_NAME.into() };

        let client = match DriveSyncClient::signin_user(client, app_info, SUCCESS_PAGE_SRC.into(), CANCELLED_PAGE_SRC.into(), TIMEOUT_MS as u128, REDIRECT_URI.into()) {
            cloud_sync::SigninResult::Success(drive_sync_client) => {
                drive_sync_client
            },
            cloud_sync::SigninResult::Denied => {
                app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SigninDenied).unwrap();
                
                return;
            },
            cloud_sync::SigninResult::Error(e) => {
                app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SigninError { 
                    message: e 
                }).unwrap();

                return;
            },
        };

        let app_state = app_state_handle.get_ref(); // locks
        let mut sync_state = app_state.sync_state.try_write().unwrap();
        sync_state.drive_client = Some(client);
        app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SignedIn).unwrap();
    });
}