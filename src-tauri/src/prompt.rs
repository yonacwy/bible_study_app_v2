use std::{sync::{mpsc::{channel, Sender}, Mutex, OnceLock}, thread::{self, JoinHandle}};

use serde::{Deserialize, Serialize};
use tauri::{Emitter, Runtime};


static RESPONSE_CHANNEL: OnceLock<Mutex<Sender<u32>>> = OnceLock::new();

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OptionColor
{
    Normal,
    Red,
    Blue,
}

pub struct PromptOption<T> where T : Send + Sync + 'static + Clone
{
    pub name: String,
    pub tooltip: Option<String>,
    pub value: T,
    pub color: OptionColor,
}

pub struct PromptArgs<T> where T : Send + Sync + 'static + Clone
{
    pub title: String,
    pub message: String,
    pub options: Vec<PromptOption<T>>
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
struct OptionData
{
    pub name: String,
    pub tooltip: Option<String>,
    pub color: OptionColor,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
struct PromptData
{
    pub title: String,
    pub message: String,
    pub options: Vec<OptionData>
}

#[tauri::command(rename_all = "snake_case")]
pub fn receive_prompt_response(value: u32) 
{
    if let Some(sender) = RESPONSE_CHANNEL.get() {
        let _ = sender.lock().unwrap().send(value);
    }
}

pub fn prompt_user<R, F, T>(app: tauri::AppHandle<impl Runtime>, args: PromptArgs<T>, on_entered: F) -> JoinHandle<R> 
    where F : FnOnce(Option<T>) -> R + Send + 'static,
          R : Send + Sync + 'static,
          T : Send + Sync + 'static + Clone
{
    thread::spawn(move || {
        let data = PromptData {
            title: args.title,
            message: args.message,
            options: args.options.iter()
                .map(|o| OptionData { name: o.name.clone(), tooltip: o.tooltip.clone(), color: o.color })
                .collect()
        };

        let (tx, rx) = channel::<u32>();
        RESPONSE_CHANNEL.set(Mutex::new(tx)).ok(); // store tx for the response handler

        app.emit("prompt-user", data).unwrap();

        let value = rx.recv().ok().map(|i| args.options[i as usize].value.clone());
        on_entered(value)
    })
}

pub fn notify_user(app: tauri::AppHandle<impl Runtime>, title: String, message: String)
{
    let args = PromptArgs::<()> { 
        title, 
        message, 
        options: vec![
            PromptOption {
                name: "Ok".into(),
                tooltip: None,
                value: (),
                color: OptionColor::Blue,
            }
        ] 
    };

    prompt_user(app, args, move |_| {});
}