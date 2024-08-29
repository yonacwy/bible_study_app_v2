use tauri::api::ipc::serialize_js;

use crate::{app_state::AppData, bible::{ChapterIndex, WordIndex}, notes::{Color, Note}};

#[tauri::command]
pub fn debug_print(message: &str)
{
	println!("Debug from JS: `{}`", message);
}

#[tauri::command]
pub fn get_bible_view() -> String 
{
	let view = AppData::get().bible.get_view();
	serde_json::to_string(&view).unwrap()
}

#[tauri::command]
pub fn get_current_chapter() -> String
{
	let chapter = AppData::get().get_current_chapter();
	serde_json::to_string(&chapter).unwrap()
}

#[tauri::command]
pub fn set_current_chapter(chapter: &str)
{
	let chapter: ChapterIndex = serde_json::from_str(chapter).unwrap();
	AppData::get().set_current_chapter(chapter);
}

#[tauri::command]
pub fn get_current_chapter_text() -> String 
{
	let current = AppData::get().get_current_chapter();
	let chapter = &AppData::get().bible.books[current.book as usize].chapters[current.number as usize];
	serde_json::to_string(chapter).unwrap()
}

#[tauri::command]
pub fn get_current_chapter_notes() -> String
{
	let current = AppData::get().get_current_chapter();
	AppData::get().read_notes(|notes| {
		let chapter_notes = &notes.notes.get(&current);
		serde_json::to_string(chapter_notes).unwrap()
	})
}

#[tauri::command]
pub fn get_current_chapter_view() -> String 
{
	let chapter = AppData::get().get_current_chapter();
	let view = AppData::get().bible.books[chapter.book as usize].chapters[chapter.number as usize].get_view();
	serde_json::to_string(&view).unwrap()
}

#[tauri::command]
pub fn add_note(start: &str, end: &str)
{
	let start: WordIndex = serde_json::from_str(start).unwrap();
	let end: WordIndex = serde_json::from_str(end).unwrap();
	
	let chapter = AppData::get().get_current_chapter();
	AppData::get().read_notes(|notebook| {
		let color = Color { r: 255, g: 0, b: 0 };
		let notes = notebook.notes.entry(chapter.clone()).or_default();
		notes.push(Note::new(color, start, end));
	})
}