pub mod sync_state;

use std::thread;

use cloud_sync::{utils::{AppInfo, ClientInfo}, DriveSyncClient, GoogleUserInfo};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, State};

use crate::{app_state::{AppState, AppStateHandle}, debug_release_val, notes::action::ActionHistory, prompt::{self, OptionColor, PromptArgs, PromptOption}, save_data::NotebookRecordSave, utils::Shared};

const CLIENT_ID: &str = "752728507993-tandjiid9gvavab6g8pa0k1kpirghho6.apps.googleusercontent.com";
const CLIENT_SECRET: &str = "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";
const REDIRECT_URI: &str = "http://localhost:8080";

const APP_ID: &str = "Ascribe.app";
const SYNC_FILE_NAME: &str = debug_release_val! {
    debug: "ascribe_data_debug.json",
    release: "ascribe_data.json"
};

const TIMEOUT_MS: u32 = 2 * 60 * 1000; // 2 minutes

const SUCCESS_PAGE_SRC: &str = include_str!("../../../ui/pages/auth/auth.html");
const CANCELLED_PAGE_SRC: &str = include_str!("../../../ui/pages/auth/cancelled.html");

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
            match app_ref.signout()
            {
                Ok(()) => app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SignedOut).unwrap(),
                Err(e) => app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SignoutError { 
                    message: e
                }).unwrap()
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



            // let user_name = client.user_info().email.clone().unwrap_or(client.user_info().sub.clone());
            // let merge_with_remote = prompt::prompt_user(app_handle.clone(), PromptArgs 
            // { 
            //     title: "Merge with Remote".into(), 
            //     message: format!("<span>You have some notes that are currently not linked with an account; Do you want to link them to your account <i>{}</i>?</span>", user_name), 
            //     options: vec![
            //         PromptOption {
            //             name: "Yes".into(),
            //             tooltip: None,
            //             value: true,
            //             color: OptionColor::Blue,
            //         },
            //         PromptOption {
            //             name: "No".into(),
            //             tooltip: None,
            //             value: false,
            //             color: OptionColor::Normal,
            //         }
            //     ] 
            // }, |v| v).join();