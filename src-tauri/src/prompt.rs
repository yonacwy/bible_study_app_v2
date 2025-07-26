use std::{collections::VecDeque, sync::{mpsc::{channel, Sender}, Mutex, OnceLock}, thread::{self, JoinHandle}};

use serde::{Deserialize, Serialize};
use tauri::{Emitter, Runtime};

static PROMPT_QUEUE: OnceLock<Mutex<VecDeque<PromptRequest>>> = OnceLock::new();
static FRONTEND_READY: OnceLock<Mutex<bool>> = OnceLock::new();
static CURRENT_PROMPT: OnceLock<Mutex<Option<Sender<u32>>>> = OnceLock::new();

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

struct PromptRequest 
{
    data: PromptData,
    sender: Sender<u32>,
}

#[tauri::command(rename_all = "snake_case")]
pub fn frontend_ready(app: tauri::AppHandle<impl Runtime>)
{
    FRONTEND_READY.get_or_init(|| Mutex::new(false));
    PROMPT_QUEUE.get_or_init(|| Mutex::new(VecDeque::new()));

    let mut ready = FRONTEND_READY.get().unwrap().lock().unwrap();
    *ready = true;

    // Process the queue one at a time
    process_next_prompt(app);
}

fn process_next_prompt(app: tauri::AppHandle<impl tauri::Runtime>) 
{
    let queue = PROMPT_QUEUE.get().unwrap();
    let mut queue = queue.lock().unwrap();
    
    if let Some(request) = queue.pop_front() 
    {
        // Set the current prompt sender
        CURRENT_PROMPT.get_or_init(|| Mutex::new(None));
        if let Ok(mut current) = CURRENT_PROMPT.get().unwrap().lock() 
        {
            *current = Some(request.sender);
        }
        
        let _ = app.emit("prompt-user", request.data);
    }
}

#[tauri::command(rename_all = "snake_case")]
pub fn frontend_unloading()
{
    FRONTEND_READY.get_or_init(|| Mutex::new(false));
    let mut current = FRONTEND_READY.get().unwrap().lock().unwrap();
    if *current
    {
        *current = false;
    }
}

#[tauri::command(rename_all = "snake_case")]
pub fn receive_prompt_response(app: tauri::AppHandle<impl tauri::Runtime>, value: u32) 
{
    if let Some(current_mutex) = CURRENT_PROMPT.get() 
    {
        if let Ok(mut current) = current_mutex.lock() 
        {
            if let Some(sender) = current.take() 
            {
                let _ = sender.send(value);
                // Process the next prompt in the queue
                process_next_prompt(app);
            }
        }
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
        
        let request = PromptRequest {
            data: data.clone(),
            sender: tx,
        };

        let ready = FRONTEND_READY.get_or_init(|| Mutex::new(false)).lock().unwrap();

        if *ready
        {
            // Check if there's already a prompt being processed
            let current_prompt = CURRENT_PROMPT.get_or_init(|| Mutex::new(None));
            let current = current_prompt.lock().unwrap();
            
            if current.is_some() {
                // Queue it
                let queue = PROMPT_QUEUE.get_or_init(|| Mutex::new(VecDeque::new()));
                queue.lock().unwrap().push_back(request);
            } else {
                drop(current); // Release lock before calling process_next_prompt
                let queue = PROMPT_QUEUE.get_or_init(|| Mutex::new(VecDeque::new()));
                queue.lock().unwrap().push_back(request);
                process_next_prompt(app);
            }
        }
        else 
        {
            let queue = PROMPT_QUEUE.get_or_init(|| Mutex::new(VecDeque::new()));
            queue.lock().unwrap().push_back(request);
        }

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

    prompt_user(app, args, |_| {});
}