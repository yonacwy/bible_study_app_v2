// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::Read;

use app_state::AppData;

pub mod app_state;
pub mod bible;
pub mod bible_parsing;
pub mod commands;
pub mod migration;
pub mod notes;
mod search_parsing;
pub mod utils;

use commands::*;
use tauri::{path::BaseDirectory, Manager};
use tauri_plugin_notification::NotificationExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let resource_path = app
                .path()
                .resolve("resources/small_kjv.txt", BaseDirectory::Resource)
                .expect("Failed to retrieve `kjv.txt` resource");

            let mut file = std::fs::File::open(&resource_path).unwrap();

            let mut text = String::new();
            file.read_to_string(&mut text).unwrap();
            AppData::init(&text, app.path());

            app.notification()
                .builder()
                .title("Tauri")
                .body("Tauri is awesome")
                .show()
                .unwrap();

            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::Destroyed => {
                AppData::get().save(window.path());
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
            get_chapter_text,
            get_verse,
            get_book_name,
            get_chapter_view,
            get_highlight_catagories,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
