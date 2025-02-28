use std::{num::NonZeroU32, sync::Mutex};
use kira::{Decibels, Tween, Tweenable};
use serde_json::Value;
use tauri::State;
use tts::bible_reader::RepeatOptions;
use crate::{app_state::{AppState, DEFAULT_BIBLE}, bible::ChapterIndex, readings::{ReadingsDatabase, SelectedReading}};

pub mod player;
pub mod tts;

pub use player::*;
pub use tts::*;

use self::bible_reader::{ReaderBehavior, ReaderState};

#[tauri::command(rename_all = "snake_case")]
pub fn run_tts_command(state: State<'_, Mutex<TtsPlayer>>, app_state: State<'_, AppState>, command: &str, args: Option<String>) -> Option<String>
{
    let args: Option<Value> = args.map(|a| serde_json::from_str(&a).unwrap());
    let app_state = app_state.get_ref();
    match command 
    {
        "request" => {

            if let Some(Ok(key)) = args.map(|a| serde_json::from_value::<PassageAudioKey>(a))
            {
                let bible = app_state.get_bible(&key.bible_name).unwrap_or(app_state.get_default_bible());

                let request = state.lock().unwrap().request(bible, key.chapter);
                let request_str = serde_json::to_string(&request).unwrap();
                return Some(request_str);
            }
            else 
            {
                println!("Error: Incorrect arguments for `request` tts command");
            }
        },
        "set" => {
            if args.as_ref().is_some() && args.as_ref().unwrap().is_string() // make sure args are correct
            {
                let id = args.unwrap().as_str().unwrap().to_owned();
                
                state.lock().unwrap().set(&id);
            }
            else 
            {
                println!("Error: Incorrect arguments for `set` tts command");
            }
        },
        "play" => state.lock().unwrap().play(),
        "pause" => state.lock().unwrap().pause(),
        "stop" => state.lock().unwrap().stop(),
        "is_playing" => {
            let is_playing = state.lock().unwrap().is_playing();
            let json = serde_json::to_string(&is_playing).unwrap();
            return Some(json)
        },
        "set_time" => 
        {
            if args.as_ref().is_some() && (args.as_ref().unwrap().is_number()) // make sure args are correct
            {
                let value = args.unwrap().as_number().unwrap().as_f64().unwrap() as f32;
                
                state.lock().unwrap().set_time(value);
            }
            else 
            {
                println!("Error: Incorrect arguments for `set_time` tts command");
            }
        },
        "get_duration" => return state.lock().unwrap().get_duration().map(|v| {
            serde_json::to_string(&v).unwrap()
        }),
        _ => println!("Error: Unknown Command")
    }

    None
}

#[tauri::command(rename_all = "snake_case")]
pub fn run_bible_reader_command(
    reader_state: State<'_, Mutex<ReaderState>>, 
    app_state: State<'_, AppState>, 
    readings_database: State<'_, ReadingsDatabase>, 

    command: &str, args: Option<&str>
) -> Option<String>
{
    let args: Option<Value> = args.map(|a| serde_json::from_str(a).unwrap());
    let app_state = app_state.get_ref();
    let mut reader_state = reader_state.lock().unwrap();

    match command 
    {
        "set_behavior" => {
            if let Some(behavior) = args.map(|a| serde_json::from_value::<ReaderBehavior>(a).unwrap()) 
            {
                reader_state.set_behavior(behavior);
            }
            else 
            {
                println!("Expected a `ReaderBehavior` argument")    
            }
        },
        "get_behavior" => {
            let json = serde_json::to_string(reader_state.get_behavior()).unwrap();
            return Some(json)
        },
        "get_next" => {

            let selected_reading = app_state.read_selected_reading(|r| {
                *r
            });

            // HACK + pain
            let selected_reading: SelectedReading = serde_json::from_str(&selected_reading.to_string()).unwrap();

            let next = reader_state.get_next(app_state.get_current_bible(), &readings_database, selected_reading);
            let json = next.map(|n| serde_json::to_string(&n).unwrap());
            return json;
        }
        "start_timer" => {
            reader_state.start_timer();
        },
        "pause_timer" => {
            reader_state.pause_timer();
        },
        "resume_timer" => {
            reader_state.resume_timer();
        },
        "stop_timer" => {
            reader_state.stop_timer();
        }

        c => println!("Unknown command: `{}`", c) 
    }

    None
}

#[tauri::command(rename_all = "snake_case")]
pub fn play_clip(state: State<'_, AudioPlayer>, app_state: State<'_, AppState>, clip_name: &str)
{
    let volume = app_state.get().as_ref().unwrap().read_settings(|settings| settings.volume);

    let decibels = Tweenable::interpolate(Decibels::SILENCE.as_amplitude(), Decibels::IDENTITY.as_amplitude(), volume as f64).log10() * 20.0;

    match state.play(clip_name)
    {
        Some(Ok(mut handle)) => handle.set_volume(decibels, Tween::default()),
        Some(Err(e)) => println!("Error with playing audio: '{}'", e.to_string()),
        None => println!("Error: failed to load audio clip '{}'", clip_name),
    }
}
