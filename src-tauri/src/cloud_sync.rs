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

const TIMEOUT_MS: u32 = 30 * 1000; // 30 seconds

const PAGE_SRC: &str = include_str!("../../ui/pages/auth.html");

#[derive(Debug)]
pub struct DriveSyncState
{
    pub drive_client: Option<DriveSyncClient>,
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
}

#[tauri::command(rename_all = "snake_case")]
pub fn run_cloud_command(app_handle: AppHandle, app_state: State<'_, AppState>, command: &str, args: Option<String>) -> Option<String>
{
    let args: Option<Value> = args.map(|a| serde_json::from_str(&a).unwrap());

    let app_state = app_state.get_ref();
    let mut sync_state = app_state.sync_state.lock().unwrap();

    match command
    {
        "signin" => {
            if sync_state.drive_client.is_some() { return None; } // already signed in

            let client = ClientInfo { id: CLIENT_ID.into(), secret: CLIENT_SECRET.into() };
            let app_info = AppInfo { app_id: APP_ID.into(), sync_file_name: SYNC_FILE_NAME.into() };

            let client = match DriveSyncClient::signin_user(client, app_info, PAGE_SRC.into(), TIMEOUT_MS as u128, REDIRECT_URI.into()) {
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
            todo!()
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
        }
        _ => println!("Error: Unknown Command")
    }

    None
}