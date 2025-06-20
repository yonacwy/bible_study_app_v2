use std::{collections::HashMap, time::SystemTime};

use itertools::Itertools;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{bible::{Bible, ChapterIndex, ReferenceLocation}, notes::{HighlightCategory, NoteData, Notebook, NotebookMap, WordAnnotations}};

pub struct NotebookActionHandler
{
    notebook_map: NotebookMap,
    action_history: ActionHistory,
    current_action_group: Vec<Action>,
}

impl NotebookActionHandler
{
    pub fn new(action_history: ActionHistory, bibles: &HashMap<String, impl AsRef<Bible>>) -> Self
    {
        let notebook_map = action_history.to_notebook_map(bibles);
        Self 
        {
            notebook_map,
            action_history,
            current_action_group: vec![],
        }
    }

    pub fn get_notebooks(&self) -> &NotebookMap
    {
        &self.notebook_map
    }

    pub fn get_or_insert_notebook(&mut self, name: String) -> &Notebook
    {
        self.notebook_map.entry(name).or_default()
    }

    pub fn push_action(&mut self, action: Action, bibles: &HashMap<String, impl AsRef<Bible>>)
    {
        action.perform(&mut self.notebook_map, bibles);
        self.current_action_group.push(action);
    }

    pub fn commit_group(&mut self)
    {
        if self.current_action_group.len() > 0
        {
            let actions = std::mem::replace(&mut self.current_action_group, vec![]);
            self.action_history.push(ActionGroup { 
                id: Uuid::new_v4(), 
                actions, 
                time: SystemTime::now() 
            });
        }
    }

    // When called, will commit the current action group so that the history is properly updated
    pub fn get_history(&mut self) -> &ActionHistory
    {
        self.commit_group();
        &self.action_history
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
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

    pub fn to_notebook_map(&self, bibles: &HashMap<String, impl AsRef<Bible>>) -> NotebookMap
    {
        let mut map = NotebookMap::new();
        for group in self.groups.iter()
        {
            group.perform(&mut map, bibles);
        }

        map
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


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ActionGroup
{
    pub id: Uuid,
    pub actions: Vec<Action>,
    pub time: SystemTime,
}

impl ActionGroup
{
    pub fn perform(&self, notebooks: &mut NotebookMap, bibles: &HashMap<String, impl AsRef<Bible>>)
    {
        for action in self.actions.iter()
        {
            action.perform(notebooks, bibles);
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Action
{
    pub notebook: String,
    pub bible_name: String,
    pub action: ActionType,
}

impl Action
{
    pub fn perform(&self, notebooks: &mut NotebookMap, bibles: &HashMap<String, impl AsRef<Bible>>)
    {
        let notebook = notebooks.entry(self.notebook.clone()).or_default();
        let bible = bibles.get(&self.bible_name).unwrap().as_ref();
        self.action.perform(notebook, bible);
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
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
    },

    EditNoteLocations {
        note_id: String,
        locations: Vec<ReferenceLocation>,
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
            ActionType::EditNoteLocations { note_id, locations } => {
                if let Some(mut note) = notebook.notes.get(note_id).cloned()
                {
                    note.locations = locations.clone();
                    notebook.update_note(note, bible);
                }
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