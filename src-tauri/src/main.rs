// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{cell::RefCell, fmt::Write, io::Read, sync::Mutex};

use app_state::AppData;
use bible::Bible;
use html_builder::Html5;
use itertools::Itertools;

pub mod bible;
pub mod parsing;
pub mod commands;
pub mod app_state;
pub mod notes;
pub mod utils;

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
			get_current_chapter, 
			set_current_chapter,
			get_current_chapter_text,
			get_current_chapter_view,
			get_highlight_catagories,
			add_highlight_category,
			remove_highlight_category,
			set_highlight_category,
			get_current_chapter_highlights,
			add_highlight_to_current_chapter,
			remove_highlight_from_current_chapter,
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
