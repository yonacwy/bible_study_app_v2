use std::collections::HashMap;

use itertools::Itertools;

use crate::{app_state::AppData, bible::ChapterIndex, notes::HighlightCategory, search_parsing::{self, SectionSearch}, utils::{get_hash_code, Color}};

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
pub fn get_current_chapter_view() -> String 
{
	let chapter = AppData::get().get_current_chapter();
	let view = AppData::get().bible.books[chapter.book as usize].chapters[chapter.number as usize].get_view();
	serde_json::to_string(&view).unwrap()
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
		let id = uuid::Uuid::new_v4().to_string();
		
		let category = HighlightCategory {
			color,
			name,
			description,
			priority,
			id: id.clone()
		};

		notebook.highlight_catagories.insert(id, category);
	})
}

#[tauri::command]
pub fn remove_highlight_category(id: &str)
{
	AppData::get().read_notes(|notebook| {
		notebook.highlight_catagories.remove(&id.to_string());
		notebook.refresh_highlights();
	})
}

#[tauri::command]
pub fn set_highlight_category(id: &str, color: &str, name: &str, description: &str, priority: &str)
{
	AppData::get().read_notes(|notebook| {
		let color = Color::from_hex(color).unwrap();
		let name = name.to_string();
		let description = description.to_string();
		let priority: u32 = priority.parse().unwrap();
		
		let category = HighlightCategory {
			color,
			name,
			description,
			priority,
			id: id.to_string()
		};

		notebook.highlight_catagories.insert(id.to_string(), category);
	})
}

#[tauri::command]
pub fn get_current_chapter_highlights() -> String
{
	let chapter = AppData::get().get_current_chapter();
	AppData::get().read_notes(|notebook| {
		if let Some(highlights) = notebook.chapter_highlights.get(&chapter)
		{
			serde_json::to_string(highlights).unwrap()
		}
		else 
		{
			serde_json::to_string("").unwrap()
		}
	})
}

#[tauri::command]
pub fn add_highlight_to_current_chapter(word_position: u32, highlight_id: &str)
{
	let chapter = AppData::get().get_current_chapter();
	AppData::get().read_notes(|notebook| {
		let chapter_highlights = match notebook.chapter_highlights.get_mut(&chapter) 
		{
			Some(highlights) => highlights,
			None => 
			{	
				notebook.chapter_highlights.insert(chapter.clone(), HashMap::new());
				notebook.chapter_highlights.get_mut(&chapter).unwrap()
			}
		};

		let word_highlights = match chapter_highlights.get_mut(&word_position)
		{
			Some(word_highlights) => word_highlights,
			None => 
			{
				chapter_highlights.insert(word_position, Vec::new());
				chapter_highlights.get_mut(&word_position).unwrap()
			},
		};

		let highlight_id = highlight_id.to_string();
		if !word_highlights.contains(&highlight_id)
		{
			word_highlights.push(highlight_id);
		}
	});
}

#[tauri::command]
pub fn remove_highlight_from_current_chapter(word_position: u32, highlight_id: &str)
{
	let chapter = AppData::get().get_current_chapter();
	AppData::get().read_notes(|notebook| {
		let Some(chapter_highlights) = notebook.chapter_highlights.get_mut(&chapter) else {
			return;
		};

		let Some(word_highlights) = chapter_highlights.get_mut(&word_position) else {
			return;
		};

		word_highlights.retain(|h| h != highlight_id);
	});
}

#[tauri::command]
pub fn search_bible(text: &str) -> Option<SectionSearch>
{
	let bible = &AppData::get().bible;
	search_parsing::parse_search(text, bible)
}