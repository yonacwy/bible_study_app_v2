use cloud_sync::{utils::{AppInfo, ClientInfo}, DriveSyncClient};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, State};

use crate::app_state::AppState;

const CLIENT_ID: &str = "752728507993-tandjiid9gvavab6g8pa0k1kpirghho6.apps.googleusercontent.com";
const CLIENT_SECRET: &str = "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";
const REDIRECT_URI: &str = "http://localhost:8080";

const APP_ID: &str = "Ascribe.app";
const SYNC_FILE_NAME: &str = "ascribe_data.json";

const TIMEOUT_MS: u32 = 60 * 1000; // 60 seconds

const SUCCESS_PAGE_SRC: &str = include_str!("../../ui/pages/auth/auth.html");
const CANCELLED_PAGE_SRC: &str = include_str!("../../ui/pages/auth/cancelled.html");

#[derive(Debug)]
pub struct CloudSyncState
{
    pub drive_client: Option<DriveSyncClient>,
    pub loading_error: Option<String>,
}

impl CloudSyncState
{
    pub fn get_save(&self) -> CloudSyncSave
    {
        let refresh_token = self.drive_client.as_ref().map(|d| d.refresh_token().to_owned());

        CloudSyncSave { 
            refresh_token,
        }
    }

    pub fn from_save(save: CloudSyncSave) -> Self 
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
                    }
                },
                Err(e) => {
                    println!("Failed to refreshed session because: {}", e);
                    Self {
                        drive_client: None,
                        loading_error: Some(e),
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
            }    
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct CloudSyncSave
{
    pub refresh_token: Option<String>,
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
    SyncEnd,
}

#[tauri::command(rename_all = "snake_case")]
pub fn run_cloud_command(app_handle: AppHandle, app_state: State<'_, AppState>, command: &str, args: Option<String>) -> Option<String>
{
    let _args: Option<Value> = args.map(|a| serde_json::from_str(&a).unwrap());

    let app_state = app_state.get_ref();
    let mut sync_state = app_state.sync_state.lock().unwrap();

    match command
    {
        "signin" => {
            if sync_state.drive_client.is_some() { return None; } // already signed in

            let client = ClientInfo { id: CLIENT_ID.into(), secret: CLIENT_SECRET.into() };
            let app_info = AppInfo { app_id: APP_ID.into(), sync_file_name: SYNC_FILE_NAME.into() };

            let client = match DriveSyncClient::signin_user(client, app_info, SUCCESS_PAGE_SRC.into(), CANCELLED_PAGE_SRC.into(), TIMEOUT_MS as u128, REDIRECT_URI.into()) {
                cloud_sync::SigninResult::Success(drive_sync_client) => {
                    drive_sync_client
                },
                cloud_sync::SigninResult::Denied => {
                    app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SigninDenied).unwrap();
                    
                    return None;
                },
                cloud_sync::SigninResult::Error(e) => {
                    app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SigninError { 
                        message: e 
                    }).unwrap();

                    return None;
                },
            };

            sync_state.drive_client = Some(client);
            app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SignedIn).unwrap();
        },
        "signout" => {
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
            todo!()
        },
        "is_signed_in" => {
            return Some(serde_json::to_string(&sync_state.drive_client.is_some()).unwrap())
        },
        "account_info" => {
            let account = sync_state.drive_client.as_ref()
                .map(|c| c.get_user_info().unwrap());

            return Some(serde_json::to_string(&account).unwrap())
        },
        "test_sync" => {
            if let Some(drive_client) = &sync_state.drive_client
            {
                app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SyncStart).unwrap();
                drive_client.write_file("Hello world!").unwrap();
                let result = drive_client.read_file().unwrap();
                app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SyncEnd).unwrap();

                println!("{:?}", result);
            }
        },
        "get_refresh_sync_error" => {
            return sync_state.loading_error.clone();
        }
        _ => println!("Error: Unknown Command")
    }

    None
}