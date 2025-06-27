use std::{sync::{mpsc::{channel, Sender}, Mutex, OnceLock}, thread::{self, JoinHandle}};

use serde::{Deserialize, Serialize};
use tauri::{Emitter, Runtime};


static RESPONSE_CHANNEL: OnceLock<Mutex<Sender<bool>>> = OnceLock::new();

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptData
{
    pub title: String,
    pub message: String,
}

#[tauri::command(rename_all = "snake_case")]
pub fn receive_prompt_response(value: bool) 
{
    if let Some(sender) = RESPONSE_CHANNEL.get() {
        let _ = sender.lock().unwrap().send(value);
    }
}

// This is the blocking Rust function you want
pub fn prompt_user<R, T, F>(app: tauri::AppHandle<R>, data: PromptData, on_entered: F) -> JoinHandle<T> 
    where R : Runtime,
          F : FnOnce(bool) -> T + Send + 'static,
          T : Send + Sync + 'static
{
    thread::spawn(move || {

        let (tx, rx) = channel::<bool>();
        RESPONSE_CHANNEL.set(Mutex::new(tx)).ok(); // store tx for the response handler

        app.emit("prompt-user", data).unwrap();

        let value = rx.recv().unwrap_or(false);
        on_entered(value)
    })
}