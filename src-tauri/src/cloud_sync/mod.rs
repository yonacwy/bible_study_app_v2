pub mod sync_state;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, State};

use crate::{app_state::AppState, debug_release_val, save_data::NotebookRecordSave};

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
            let app_handle_inner = app_handle.clone();
            let result = app_ref.signin(move |e| {
                app_handle_inner.emit(CLOUD_EVENT_NAME, e).unwrap()
            });

            if let Err(e) = result
            {
                app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SigninError { message: e }).unwrap();
                return None;
            }
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
            if app_ref.is_signed_in()
            {
                if let Err(e) = app_ref.signout()
                {
                    app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SignoutError { message: e }).unwrap();
                    return None;
                }
            }

            let app_handle_inner = app_handle.clone();
            let result = app_ref.signin(move |e| {
                app_handle_inner.emit(CLOUD_EVENT_NAME, e).unwrap()
            });

            if let Err(e) = result
            {
                app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SigninError { message: e }).unwrap();
                return None;
            }
        },
        "is_signed_in" => {
            let is_signed_in = app_state.get_ref().is_signed_in();
            return Some(serde_json::to_string(&is_signed_in).unwrap())
        },
        "account_info" => {
            let account = app_state.get_ref().get_user_info();
            return Some(serde_json::to_string(&account).unwrap())
        },
        "get_refresh_sync_error" => {
            return app_state.get_ref().get_refresh_sync_error();
        },
        "set_can_ask_sync" => {
            if let Some(value) = args.and_then(|arg| serde_json::from_value::<bool>(arg).ok())
            {
                let app_ref = app_state.get_ref();
                app_ref.read_ask_enable_sync(|v| {
                    *v = value
                })
            }
            else 
            {
                println!("Invalid arguments for `set_can_ask_sync` command");
            }
        },
        "get_can_ask_sync" => {
            let can_ask_enable_sync = app_state.get_ref().read_ask_enable_sync(|v| *v);
            return Some(serde_json::to_string(&can_ask_enable_sync).unwrap());
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