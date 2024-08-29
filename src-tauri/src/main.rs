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

use commands::*;

fn main() {
	tauri::Builder::default()
		.setup(|app| {
			let resource_path = app.path_resolver()
				.resolve_resource("resources/small_kjv.txt")
				.expect("Failed to retrieve `kjv.txt` resource");

			println!("{:?}", resource_path);

			let mut file = std::fs::File::open(&resource_path).unwrap();

			let mut text = String::new();
			file.read_to_string(&mut text).unwrap();
			AppData::init(&text);

			Ok(())
		})
		.invoke_handler(tauri::generate_handler![
			debug_print, 
			get_bible_view, 
			get_current_chapter, 
			set_current_chapter,
			get_current_chapter_text,
			get_current_chapter_notes,
			get_current_chapter_view,
			add_note,
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
