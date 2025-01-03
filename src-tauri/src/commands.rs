use std::collections::HashMap;

use itertools::Itertools;

use crate::{
    app_state::{AppData, ViewState}, bible::{ChapterIndex, ReferenceLocation, Verse}, notes::{HighlightCategory, WordAnnotations}, search_parsing::{self, *}, settings::Settings, utils::Color
};

#[tauri::command(rename_all = "snake_case")]
pub fn debug_print(message: &str) {
    println!("Debug from JS: `{}`", message);
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_bible_view() -> String {
    let view = AppData::get().bible.get_view();
    serde_json::to_string(&view).unwrap()
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_current_view_state() -> ViewState {
    let index = AppData::get().get_view_state_index();
    AppData::get().read_view_states(|states| states[index].clone())
}

#[tauri::command(rename_all = "snake_case")]
pub fn push_view_state(view_state: ViewState) {
    let index = get_view_state_index();
    AppData::get().read_view_states(|states| {
        if states.last().is_some_and(|s| *s == view_state) {
            return;
        }

        let next = (index + 1) as usize;
        if next != states.len() {
            states.drain(next..states.len());
        }

        states.push(view_state.clone());
    });

    to_next_view_state();
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_view_state_count() -> u32 {
    AppData::get().read_view_states(|states| states.len() as u32)
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_view_state_index() -> u32 {
    AppData::get().get_view_state_index() as u32
}

#[tauri::command(rename_all = "snake_case")]
pub fn to_next_view_state() {
    let current = get_view_state_index();
    let max = get_view_state_count() - 1;

    if current < max {
        AppData::get().set_view_state_index(current as usize + 1);
    }
}

#[tauri::command(rename_all = "snake_case")]
pub fn to_previous_view_state() {
    let current = get_view_state_index();
    if current > 0 {
        AppData::get().set_view_state_index(current as usize - 1);
    }
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_chapter_text(chapter: ChapterIndex) -> String {
    let chapter =
        &AppData::get().bible.books[chapter.book as usize].chapters[chapter.number as usize];
    serde_json::to_string(chapter).unwrap()
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_verse(book: u32, chapter: u32, verse: u32) -> Verse {
    AppData::get().bible.books[book as usize].chapters[chapter as usize].verses[verse as usize]
        .clone()
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_book_name(book: u32) -> String {
    AppData::get().bible.books[book as usize].name.clone()
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_chapter_view(chapter: ChapterIndex) -> String {
    let view = AppData::get().bible.books[chapter.book as usize].chapters[chapter.number as usize]
        .get_view();
    serde_json::to_string(&view).unwrap()
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_highlight_categories() -> String {
    AppData::get()
        .read_notes(|notebook| serde_json::to_string(&notebook.highlight_categories).unwrap())
}

#[tauri::command(rename_all = "snake_case")]
pub fn add_highlight_category(color: &str, name: &str, description: &str, priority: &str) {
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
            id: id.clone(),
        };

        notebook.highlight_categories.insert(id, category);
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn remove_highlight_category(id: &str) {
    AppData::get().read_notes(|notebook| {
        notebook.highlight_categories.remove(&id.to_string());
        notebook.refresh_highlights();
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn set_highlight_category(
    id: &str,
    color: &str,
    name: &str,
    description: &str,
    priority: &str,
) {
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
            id: id.to_string(),
        };

        notebook
            .highlight_categories
            .insert(id.to_string(), category);
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_chapter_annotations(chapter: ChapterIndex) -> String {
    AppData::get().read_notes(|notebook| {
        if let Some(highlights) = notebook.annotations.get(&chapter) {
            serde_json::to_string(highlights).unwrap()
        } else {
            serde_json::to_string("").unwrap()
        }
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn highlight_word(chapter: ChapterIndex, word_position: u32, highlight_id: &str) {
    AppData::get().read_notes(|notebook| {
        let chapter_annotations = match notebook.annotations.get_mut(&chapter) {
            Some(highlights) => highlights,
            None => {
                notebook.annotations.insert(chapter.clone(), HashMap::new());
                notebook.annotations.get_mut(&chapter).unwrap()
            }
        };

        let word_notes = match chapter_annotations.get_mut(&word_position) {
            Some(word_highlights) => word_highlights,
            None => {
                chapter_annotations.insert(
                    word_position,
                    WordAnnotations {
                        highlights: vec![],
                        notes: vec![],
                    },
                );
                chapter_annotations.get_mut(&word_position).unwrap()
            }
        };

        let highlight_id = highlight_id.to_string();
        if !word_notes.highlights.contains(&highlight_id) {
            word_notes.highlights.push(highlight_id);
        }
    });
}

#[tauri::command(rename_all = "snake_case")]
pub fn erase_highlight(chapter: ChapterIndex, word_position: u32, highlight_id: &str) {
    AppData::get().read_notes(|notebook| {
        let Some(chapter_highlights) = notebook.annotations.get_mut(&chapter) else {
            return;
        };

        let Some(word_notes) = chapter_highlights.get_mut(&word_position) else {
            return;
        };

        word_notes.highlights.retain(|h| h != highlight_id);
    });
}

#[tauri::command(rename_all = "snake_case")]
pub fn parse_bible_search(text: &str) -> ParsedSearchResult {
    let bible = &AppData::get().bible;
    parse_search(text, bible)
}

#[tauri::command(rename_all = "snake_case")]
pub fn run_word_search(words: Vec<String>) -> Vec<WordSearchResult> {
    let bible = &AppData::get().bible;
    let words = words.iter().map(|w| w.as_str()).collect_vec();
    search_bible(&words, bible)
}

#[tauri::command(rename_all = "snake_case")]
pub fn add_note(text: String, locations: Vec<ReferenceLocation>) -> String {
    AppData::get().read_notes(move |notebook| {
        let id = uuid::Uuid::new_v4().to_string();
        notebook.add_note(
            &AppData::get().bible,
            id.clone(),
            text.to_owned(),
            locations.to_owned(),
        );
        id
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn remove_note(id: &str) {
    AppData::get().read_notes(|notebook| {
        notebook.remove_note(id);
    });
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_note(id: &str) -> String {
    AppData::get().read_notes(|notebook| {
        let note = notebook.get_note(id);
        serde_json::to_string(note).unwrap()
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_editing_note() -> Option<String> {
    AppData::get().read_editing_note(|editing_note| editing_note.clone())
}

#[tauri::command(rename_all = "snake_case")]
pub fn set_editing_note(note: Option<String>) {
    AppData::get().read_editing_note(|editing_note| *editing_note = note.clone())
}

#[tauri::command(rename_all = "snake_case")]
pub fn update_note(id: String, locations: Vec<ReferenceLocation>, text: String) {
    AppData::get().read_notes(move |notebook| {
        notebook.remove_note(&id);
        notebook.add_note(
            &AppData::get().bible,
            id.clone(),
            text.clone(),
            locations.clone(),
        );
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_settings() -> Settings
{
    AppData::get().read_settings(|settings| {
        settings.clone()
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn set_settings(settings: Option<Settings>)
{
    AppData::get().read_settings(|old| {

        match &settings
        {
            Some(s) => *old = s.clone(),
            None => *old = Settings::default()
        };
    });
}

#[tauri::command(rename_all = "snake_case")]
pub fn should_display_migration() -> bool 
{
    AppData::get().should_display_migration()
}

#[tauri::command(rename_all = "snake_case")]
pub fn should_display_no_save() -> bool 
{
    AppData::get().should_display_no_save()
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_book_from_name(prefix: Option<u32>, name: &str) -> Option<BookTitleData>
{
    search_parsing::get_book_from_name(prefix, name, &AppData::get().bible).ok()
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_selected_reading() -> u32 
{
    AppData::get().read_selected_reading(|selected_reading| {
        *selected_reading
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn set_selected_reading(selected_reading: u32)
{
    AppData::get().read_selected_reading(|sr| {
        *sr = selected_reading;
    })
}