pub mod sync_state;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, State};

use crate::{app_state::{AppState, AppStateHandle}, debug_release_val, prompt::{self, OptionColor, PromptArgs, PromptOption}, save_data::NotebookRecordSave};

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
        display_popup: Option<bool>,
    },
}

#[tauri::command(rename_all = "snake_case")]
pub fn run_cloud_command(app_handle: AppHandle, app_state: State<'_, AppState>, command: &str, args: Option<String>) -> Option<String>
{
    let args: Option<Value> = args.map(|a| serde_json::from_str(&a).unwrap());

    match command
    {
        "signin" => {
            let app_state_handle = app_state.get_handle();
            let app_ref = app_state.get_ref();
            let app_handle_inner = app_handle.clone();
            
            let result = app_ref.signin(move |e| {
                if let CloudEvent::SignedIn = e
                {
                    sync_with_cloud(&app_handle_inner, &app_state_handle, true);
                    let is_empty = app_state_handle.get_ref().is_unowned_save_empty();
                    if !is_empty
                    {
                        ask_user_if_merge_unowned_save(app_state_handle.clone(), app_handle_inner.clone());
                    }
                }
                
                app_handle_inner.emit(CLOUD_EVENT_NAME, e.clone()).unwrap();
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
            sync_with_cloud(&app_handle, &app_state.get_handle(), true)
        }
        _ => println!("Error: Unknown Command")
    }

    None
}

fn sync_with_cloud(app_handle: &AppHandle, app_state_handle: &AppStateHandle, display_sync_popup: bool)
{
    app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SyncStart).unwrap();
            
    match app_state_handle.get_ref().sync_with_cloud()
    {
        Ok(()) => app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SyncEnd { error: None, display_popup: Some(display_sync_popup) }),
        Err(e) => app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SyncEnd { error: Some(e), display_popup: Some(display_sync_popup) })
    }.unwrap()
}

fn ask_user_if_merge_unowned_save(app_state_handle: AppStateHandle, app_handle: AppHandle)
{
    let app_ref = app_state_handle.get_ref();
    let user_info = app_ref.get_user_info().expect("This should not be `None` here");
    let user_name = user_info.email.clone().unwrap_or(user_info.sub.clone());
    drop(app_ref); // need to drop the ref so that it does not block

    println!("Asking to merge");

    prompt::prompt_user(app_handle.clone(), PromptArgs 
    { 
        title: "Merge with Remote".into(), 
        message: format!("<span>You have some notes that are currently not linked with an account; Do you want to link them to your account <i>{}</i>?</span>", user_name), 
        options: vec![
            PromptOption {
                name: "Yes".into(),
                tooltip: None,
                value: true,
                color: OptionColor::Blue,
            },
            PromptOption {
                name: "No".into(),
                tooltip: None,
                value: false,
                color: OptionColor::Normal,
            }
        ] 
    }, move |v| match v {
        Some(true) => {
            app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SyncStart).unwrap();
            app_state_handle.get_ref().take_and_merge_unowned_save();
            if let Err(e) = app_state_handle.get_ref().sync_with_cloud()
            {
                let message = format!("There was an error when syncing with your data. It was merged successfully, but it has not been pushed to the cloud. To push it to the cloud, go out of settings, and press the sync button. Error: {}", e);
                app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SyncEnd { error: Some(message), display_popup: None }).unwrap();
                return;
            }
            app_handle.emit(CLOUD_EVENT_NAME, CloudEvent::SyncEnd { error: None, display_popup: None }).unwrap();
            prompt::notify_user(app_handle, "Save Merged".into(), "You chose to merge your unlinked data. It is now moved into your account save.".into());
        },
        Some(false) => {
            prompt::notify_user(app_handle, "Did not Merge".into(), "You chose to not merge your unlinked data. It will still be there when you sign out".into());
        },
        None => {
            prompt::notify_user(app_handle, "Error".into(), "There was an error when receiving the merge with remote response".into());
        }
    });
}