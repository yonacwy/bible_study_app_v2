use crate::{app_state::AppData, bible::ChapterRef};

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
	let chapter: ChapterRef = serde_json::from_str(chapter).unwrap();
	AppData::get().set_current_chapter(chapter);
}

#[tauri::command]
pub fn get_current_chapter_data() -> String 
{
	let current = AppData::get().get_current_chapter();
	let chapter = &AppData::get().bible.books.iter()
		.find(|b| b.name == current.book).unwrap()
		.chapters[current.number as usize];

	serde_json::to_string(chapter).unwrap()
}