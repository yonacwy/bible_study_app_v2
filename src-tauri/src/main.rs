// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::Read;

use app_state::AppData;

pub mod bible;
pub mod bible_parsing;
pub mod commands;
pub mod app_state;
pub mod notes;
pub mod utils;
mod search_parsing;

use commands::*;

fn main() {
	tauri::Builder::default()
		.setup(|app| {
			let resource_path = app.path_resolver()
				.resolve_resource("resources/small_kjv.txt")
				.expect("Failed to retrieve `kjv.txt` resource");

			let mut file = std::fs::File::open(&resource_path).unwrap();

			let mut text = String::new();
			file.read_to_string(&mut text).unwrap();
			AppData::init(&text, app.path_resolver());

			Ok(())
		})
		.on_window_event(|event| match event.event() {
			tauri::WindowEvent::Destroyed => 
			{
				AppData::get().save();
			}
			_ => {}
		})
		.invoke_handler(tauri::generate_handler![
			debug_print, 
			get_bible_view,
			get_current_view_state,
			push_view_state,
			get_view_state_count,
			to_next_view_state,
			go_previous_view_state,
			get_chapter_text,
			get_verse,
			get_book_name,
			get_chapter_view,
			get_highlight_catagories,
			add_highlight_category,
			remove_highlight_category,
			set_highlight_category,
			get_chapter_highlights,
			highlight_word,
			erase_highlight,
			search_bible,
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
