// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use app_state::{AppData, AppState};

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

use audio::AudioPlayer;
use commands::*;
use readings::ReadingsDatabase;
use tauri::Manager;

fn main() 
{
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {

            app.manage(AudioPlayer::new(app.path(), audio::DEFAULT_SOURCES));
            app.manage(ReadingsDatabase::new(app.path()));
            app.manage(AppState::create(app.path()));

            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::Destroyed => {
                let state = window.app_handle().state::<AppState>();
                state.get().as_ref().unwrap().save(window.path());
            }
            _ => {}
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
            highlight_word,
            erase_highlight,
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
            open_file_explorer,
            open_save_in_file_explorer,
            get_current_bible_version,
            set_current_bible_version,
            get_bible_versions,
            is_initialized,
        ])
        .run(tauri::generate_context!()) 
        .expect("error while running tauri application");
}
