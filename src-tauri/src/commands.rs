use itertools::Itertools;

use crate::{app_state::AppData, bible::{ChapterIndex, WordIndex}, notes::{HighlightCategory, Note}, utils::{get_hash_code, Color}};

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
		let color = Color { r: 255, g: 233, b: 0 };
		let notes = notebook.notes.entry(chapter.clone()).or_default();
		notes.push(Note::new(color, start, end));
	})
}

#[tauri::command]
pub fn get_highlight_catagories() -> String 
{
	AppData::get().read_notes(|notebook| {
		serde_json::to_string(&notebook.highlight_catagories).unwrap()
	})
}

#[tauri::command]
pub fn add_highlight_category(color: &str, name: &str, description: &str, priority: &str)
{
	AppData::get().read_notes(|notebook| {
		let color = Color::from_hex(color).unwrap();
		let name = name.to_string();
		let description = description.to_string();
		let priority: u32 = priority.parse().unwrap();
		let id = get_hash_code(&uuid::Uuid::new_v4());
		
		let category = HighlightCategory {
			color,
			name,
			description,
			priority,
			id
		};

		notebook.highlight_catagories.insert(id, category);
	})
}

#[tauri::command]
pub fn remove_highlight_category(id: &str)
{
	AppData::get().read_notes(|notebook| {
		let id = serde_json::from_str(id).unwrap();
		notebook.highlight_catagories.remove(&id);
	})
}

pub fn set_highlight_category(id: &str, color: &str, name: &str, description: &str, priority: &str)
{
	AppData::get().read_notes(|notebook| {
		let color = Color::from_hex(color).unwrap();
		let name = name.to_string();
		let description = description.to_string();
		let priority: u32 = priority.parse().unwrap();
		let id = id.parse().unwrap();
		
		let category = HighlightCategory {
			color,
			name,
			description,
			priority,
			id
		};

		notebook.highlight_catagories.insert(id, category);
	})
}