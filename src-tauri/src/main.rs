// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::sync::Mutex;

use anyhow::Result;
use app_state::AppState;

pub mod app_state;
pub mod bible;
pub mod bible_parsing;
pub mod commands;
pub mod migration;
pub mod notes;
pub mod searching;
pub mod utils;
pub mod settings;
pub mod audio;
pub mod readings;
pub mod save_data;
pub mod cloud_sync;
pub mod prompt;

use audio::{init_espeak, AudioPlayer, TtsPlayer};
use commands::*;
use readings::ReadingsDatabase;
use tauri::{webview::PageLoadEvent, Manager, Listener};

fn main() -> Result<()>
{

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            init_espeak(&app.path());
            app.manage(Mutex::new(TtsPlayer::new(app.path(), app.handle().clone())?));
            app.manage(AudioPlayer::new(app.path(), audio::DEFAULT_SOURCES));
            app.manage(ReadingsDatabase::new(app.path()));
            app.manage(AppState::create(app.path(), app.handle().clone()));

            let app_handle_inner = app.handle().clone();
            app.listen("loaded-tts-save", move |json| {
                let state = app_handle_inner.state::<Mutex<TtsPlayer>>();
                let mut state = state.lock().unwrap();
                let parsed: audio::TtsSettings = serde_json::from_str(json.payload()).unwrap();
                state.set_settings(parsed);
            });

            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            
            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::Destroyed => {
                let state = window.app_handle().state::<AppState>();
                let tts_reader = window.app_handle().state::<Mutex<TtsPlayer>>();

                let tts_settings = tts_reader.lock().unwrap().get_settings();
                state.get().as_ref().unwrap().save(window.path(), tts_settings);
            },
            _ => {}
        })
        .on_page_load(|v, p| {
            if p.event() == PageLoadEvent::Started
            {
                let state = v.app_handle().state::<Mutex<TtsPlayer>>();
                state.lock().unwrap().stop();
            }
        })
        .invoke_handler(tauri::generate_handler![
            debug_print,
            get_bible_view,
            get_current_view_state,
            get_view_state_index,
            push_view_state,
            get_view_state_count,
            to_next_view_state,
            to_previous_view_state,
            clear_view_states,
            get_chapter_text,
            get_verse,
            get_book_name,
            get_chapter_view,
            get_highlight_categories,
            add_highlight_category,
            remove_highlight_category,
            set_highlight_category,
            get_chapter_annotations,
            highlight_location,
            erase_location_highlight,
            parse_bible_search,
            run_word_search,
            add_note,
            remove_note,
            get_note,
            update_note,
            get_editing_note,
            set_editing_note,
            should_display_migration,
            should_display_no_save,
            get_settings,
            set_settings,
            audio::play_clip,
            readings::get_reading,
            get_book_from_name,
            get_selected_reading,
            set_selected_reading,
            open,
            open_save_in_file_explorer,
            get_current_bible_version,
            set_current_bible_version,
            get_bible_versions,
            is_initialized,
            audio::run_tts_command,
            get_reader_behavior,
            set_reader_behavior,
            get_recent_highlights,
            set_recent_highlights,
            cloud_sync::run_cloud_command,
            prompt::receive_prompt_response,
            prompt::frontend_ready,
            prompt::frontend_unloading,
        ])
        .run(tauri::generate_context!()) 
        .expect("error while running tauri application");

    Ok(())
}
