use std::{collections::HashMap, time::SystemTime};

use itertools::Itertools;
use uuid::Uuid;

use crate::{bible::{Bible, ChapterIndex, ReferenceLocation}, notes::{HighlightCategory, NoteData, Notebook, NotebookSave, WordAnnotations}};

pub struct ActionHistory
{
    pub groups: Vec<ActionGroup>,
}

impl ActionHistory
{
    pub fn new() -> Self
    {
        Self 
        {
            groups: vec![]
        }
    }

    pub fn push(&mut self, group: ActionGroup)
    {
        self.groups.push(group);
        self.groups.sort_by(|a, b| a.time.cmp(&b.time));
    }

    pub fn to_save(&self, bibles: &HashMap<String, Bible>) -> NotebookSave
    {
        let mut save = NotebookSave::new();
        for group in self.groups.iter()
        {
            group.perform(&mut save, bibles);
        }

        save
    }

    pub fn merge(left: Self, right: Self) -> Self
    {
        let mut groups = Vec::new();
        groups.extend(left.groups.into_iter());
        groups.extend(right.groups.into_iter());

        groups = groups.into_iter().unique_by(|v| v.id.clone()).collect_vec();
        groups.sort_by(|a, b| a.time.cmp(&b.time));

        Self { groups }
    }
}


pub struct ActionGroup
{
    pub id: Uuid,
    pub actions: Vec<Action>,
    pub time: SystemTime,
}

impl ActionGroup
{
    pub fn perform(&self, save: &mut NotebookSave, bibles: &HashMap<String, Bible>)
    {
        for action in self.actions.iter()
        {
            action.perform(save, bibles);
        }
    }

    pub fn push(&mut self, action: Action)
    {
        self.actions.push(action);
        self.time = SystemTime::now();
    }
}

pub struct Action
{
    pub notebook: String,
    pub bible_name: String,
    pub action: ActionType,
}

impl Action
{
    pub fn perform(&self, save: &mut NotebookSave, bibles: &HashMap<String, Bible>)
    {
        let notebook = save.notebooks.entry(self.notebook.clone()).or_default();
        let bible = bibles.get(&self.bible_name).unwrap();
        self.action.perform(notebook, bible);
    }
}

pub enum ActionType 
{
    CreateNote(NoteData),
    EditNote(NoteData),
    DeleteNote(String),

    CreateHighlight(HighlightCategory),
    EditHighlight(HighlightCategory),
    DeleteHighlight(String),

    Highlight {
        highlight_id: String,
        location: ReferenceLocation,
    },
    Erase {
        highlight_id: String,
        location: ReferenceLocation,
    }
}

impl ActionType
{
    pub fn perform(&self, notebook: &mut Notebook, bible: &Bible)
    {
        match self 
        {
            ActionType::CreateNote(note_data) => {
                notebook.add_note(note_data.clone(), bible);
            },
            ActionType::EditNote(note_data) => {
                if notebook.notes.contains_key(&note_data.id)
                {
                    notebook.update_note(note_data.clone(), bible);
                }
            },
            ActionType::DeleteNote(id) => {
                notebook.remove_note(&id);
            },
            ActionType::CreateHighlight(highlight_category) => {
                notebook.highlight_categories.insert(highlight_category.id.clone(), highlight_category.clone());
            },
            ActionType::EditHighlight(highlight_category) => {
                if notebook.highlight_categories.contains_key(&highlight_category.id)
                {
                    notebook.highlight_categories.insert(highlight_category.id.clone(), highlight_category.clone());
                }
            },
            ActionType::DeleteHighlight(id) => {
                if notebook.highlight_categories.contains_key(id)
                {
                    notebook.highlight_categories.remove(id);
                    notebook.refresh_highlights();
                }
            },
            ActionType::Highlight { highlight_id, location } => {
                let chapter_view = bible.get_chapter(location.chapter).get_view();
                location.range.get_chapter_word_indices(&chapter_view).iter().for_each(|idx| {
                    Self::highlight_word(notebook, &location.chapter, *idx, highlight_id);
                });
            },
            ActionType::Erase { highlight_id, location } => {
                let chapter_view = bible.get_chapter(location.chapter).get_view();
                location.range.get_chapter_word_indices(&chapter_view).iter().for_each(|idx| {
                    Self::erase_word_highlight(notebook, &location.chapter, *idx, highlight_id);
                });
            },
        }
    }

    fn highlight_word(notebook: &mut Notebook, chapter: &ChapterIndex, word_position: u32, highlight_id: &str)
    {
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
    }

    fn erase_word_highlight(notebook: &mut Notebook, chapter: &ChapterIndex, word_position: u32, highlight_id: &str)
    {
        let Some(chapter_highlights) = notebook.annotations.get_mut(&chapter) else {
            return;
        };

        let Some(word_notes) = chapter_highlights.get_mut(&word_position) else {
            return;
        };

        word_notes.highlights.retain(|h| h != highlight_id);
    }
}