#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::sync::Arc;
    use std::time::{SystemTime, Duration};
    use uuid::Uuid;
    use crate::bible::{Bible, Book, Chapter, Verse, Word, ChapterIndex, ReferenceLocation, WordRange};
    use crate::notes::action::{Action, ActionGroup, ActionHistory, ActionType};
    use crate::notes::{HighlightCategory, NoteData, NoteSourceType};
    use crate::utils::Color;

    // Test data builders
    fn create_test_bible() -> Bible {
        let words = vec![
            Word { text: "In".to_string(), italicized: false, red: false },
            Word { text: "the".to_string(), italicized: false, red: false },
            Word { text: "beginning".to_string(), italicized: false, red: false },
            Word { text: "God".to_string(), italicized: false, red: true },
            Word { text: "created".to_string(), italicized: false, red: false },
            Word { text: "the".to_string(), italicized: false, red: false },
            Word { text: "heavens".to_string(), italicized: false, red: false },
            Word { text: "and".to_string(), italicized: false, red: false },
            Word { text: "the".to_string(), italicized: false, red: false },
            Word { text: "earth".to_string(), italicized: false, red: false },
        ];

        let verse = Verse { words };
        let chapter = Chapter { verses: vec![verse] };
        let book = Book {
            name: "Genesis".to_string(),
            chapters: vec![chapter],
        };

        Bible {
            name: "Test Bible".to_string(),
            desc: "A simple test bible".to_string(),
            books: vec![book],
        }
    }

    fn create_test_bibles_map() -> HashMap<String, Arc<Bible>> {
        let mut bibles = HashMap::new();
        bibles.insert("Test Bible".to_string(), Arc::new(create_test_bible()));
        bibles
    }

    fn create_highlight_category(id: &str, name: &str, color: Color, priority: u32) -> HighlightCategory {
        HighlightCategory {
            color,
            name: name.to_string(),
            description: format!("{} passages", name),
            source_type: NoteSourceType::Markdown,
            priority,
            id: id.to_string(),
        }
    }

    fn create_note(id: &str, text: &str, word_start: u32, word_end: u32) -> NoteData {
        NoteData {
            id: id.to_string(),
            text: text.to_string(),
            locations: vec![ReferenceLocation {
                chapter: ChapterIndex { book: 0, number: 0 },
                range: WordRange {
                    verse_start: 0,
                    word_start,
                    verse_end: 0,
                    word_end,
                },
            }],
            source_type: NoteSourceType::Markdown,
        }
    }

    fn create_reference_location(word_start: u32, word_end: u32) -> ReferenceLocation {
        ReferenceLocation {
            chapter: ChapterIndex { book: 0, number: 0 },
            range: WordRange {
                verse_start: 0,
                word_start,
                verse_end: 0,
                word_end,
            },
        }
    }

    // Client simulation functions
    fn simulate_client_a_actions(base_time: SystemTime) -> ActionHistory {
        let mut history = ActionHistory::new();
        let notebook_name = "client-a-notebook";
        let bible_name = "Test Bible";

        // Client A - Time 0: Creates a highlight category and applies it
        let mut group1 = ActionGroup {
            id: Uuid::new_v4(),
            actions: vec![],
            time: base_time,
        };

        let yellow_highlight = create_highlight_category(
            "highlight-yellow", 
            "Important", 
            Color { r: 255, g: 255, b: 0 }, 
            1
        );

        group1.push(Action {
            notebook: notebook_name.to_string(),
            bible_name: bible_name.to_string(),
            action: ActionType::CreateHighlight(yellow_highlight),
        });

        group1.push(Action {
            notebook: notebook_name.to_string(),
            bible_name: bible_name.to_string(),
            action: ActionType::Highlight {
                highlight_id: "highlight-yellow".to_string(),
                location: create_reference_location(0, 2), // "In the beginning"
            },
        });

        history.push(group1);

        // Client A - Time 2: Creates a note and highlights more text
        let mut group2 = ActionGroup {
            id: Uuid::new_v4(),
            actions: vec![],
            time: base_time + Duration::from_secs(120), // 2 minutes later
        };

        let creation_note = create_note(
            "note-creation", 
            "This describes the creation of the world", 
            0, 
            4
        );

        group2.push(Action {
            notebook: notebook_name.to_string(),
            bible_name: bible_name.to_string(),
            action: ActionType::CreateNote(creation_note),
        });

        group2.push(Action {
            notebook: notebook_name.to_string(),
            bible_name: bible_name.to_string(),
            action: ActionType::Highlight {
                highlight_id: "highlight-yellow".to_string(),
                location: create_reference_location(3, 4), // "God created"
            },
        });

        history.push(group2);

        // Client A - Time 4: Edits the highlight category
        let mut group3 = ActionGroup {
            id: Uuid::new_v4(),
            actions: vec![],
            time: base_time + Duration::from_secs(240), // 4 minutes later
        };

        let updated_yellow_highlight = create_highlight_category(
            "highlight-yellow", 
            "Very Important", 
            Color { r: 255, g: 215, b: 0 }, // Gold color
            1
        );

        group3.push(Action {
            notebook: notebook_name.to_string(),
            bible_name: bible_name.to_string(),
            action: ActionType::EditHighlight(updated_yellow_highlight),
        });

        history.push(group3);

        history
    }

    fn simulate_client_b_actions(base_time: SystemTime) -> ActionHistory {
        let mut history = ActionHistory::new();
        let notebook_name = "client-b-notebook";
        let bible_name = "Test Bible";

        // Client B - Time 1: Creates a different highlight category
        let mut group1 = ActionGroup {
            id: Uuid::new_v4(),
            actions: vec![],
            time: base_time + Duration::from_secs(60), // 1 minute later
        };

        let green_highlight = create_highlight_category(
            "highlight-green", 
            "Study", 
            Color { r: 0, g: 255, b: 0 }, 
            2
        );

        group1.push(Action {
            notebook: notebook_name.to_string(),
            bible_name: bible_name.to_string(),
            action: ActionType::CreateHighlight(green_highlight),
        });

        group1.push(Action {
            notebook: notebook_name.to_string(),
            bible_name: bible_name.to_string(),
            action: ActionType::Highlight {
                highlight_id: "highlight-green".to_string(),
                location: create_reference_location(5, 9), // "the heavens and the earth"
            },
        });

        history.push(group1);

        // Client B - Time 3: Creates a note and removes some highlighting
        let mut group2 = ActionGroup {
            id: Uuid::new_v4(),
            actions: vec![],
            time: base_time + Duration::from_secs(180), // 3 minutes later
        };

        let study_note = create_note(
            "note-study", 
            "Need to study the Hebrew word for 'heavens'", 
            6, 
            6
        );

        group2.push(Action {
            notebook: notebook_name.to_string(),
            bible_name: bible_name.to_string(),
            action: ActionType::CreateNote(study_note),
        });

        group2.push(Action {
            notebook: notebook_name.to_string(),
            bible_name: bible_name.to_string(),
            action: ActionType::Erase {
                highlight_id: "highlight-green".to_string(),
                location: create_reference_location(7, 9), // Remove from "and the earth"
            },
        });

        history.push(group2);

        // Client B - Time 5: Creates another highlight category
        let mut group3 = ActionGroup {
            id: Uuid::new_v4(),
            actions: vec![],
            time: base_time + Duration::from_secs(300), // 5 minutes later
        };

        let blue_highlight = create_highlight_category(
            "highlight-blue", 
            "Questions", 
            Color { r: 0, g: 0, b: 255 }, 
            3
        );

        group3.push(Action {
            notebook: notebook_name.to_string(),
            bible_name: bible_name.to_string(),
            action: ActionType::CreateHighlight(blue_highlight),
        });

        history.push(group3);

        history
    }

    // Test functions
    pub fn generate_simple_action_history() -> ActionHistory {
        simulate_client_a_actions(SystemTime::now())
    }

    #[test]
    fn test_basic_action_history() {
        let history = generate_simple_action_history();
        let bibles = create_test_bibles_map();
        
        // Verify structure
        assert_eq!(history.groups.len(), 3);
        
        // Verify chronological ordering
        for i in 1..history.groups.len() {
            assert!(history.groups[i-1].time <= history.groups[i].time);
        }
        
        // Test conversion to save
        let save = history.to_save(&bibles);
        assert!(save.notebooks.contains_key("client-a-notebook"));
        
        let notebook = &save.notebooks["client-a-notebook"];
        assert_eq!(notebook.notes.len(), 1);
        assert_eq!(notebook.highlight_categories.len(), 1);
        
        // Verify the highlight category was updated (not duplicated)
        let highlight = &notebook.highlight_categories["highlight-yellow"];
        assert_eq!(highlight.name, "Very Important");
        assert_eq!(highlight.color.g, 215); // Gold color
        
        println!("✓ Basic action history test passed");
    }

    #[test]
    fn test_action_history_merge() {
        let base_time = SystemTime::now();
        
        // Simulate two clients working simultaneously
        let client_a_history = simulate_client_a_actions(base_time);
        let client_b_history = simulate_client_b_actions(base_time);
        
        println!("Client A created {} action groups", client_a_history.groups.len());
        println!("Client B created {} action groups", client_b_history.groups.len());
        
        // Merge the histories (simulating server-side merge)
        let merged_history = ActionHistory::merge(client_a_history, client_b_history);
        
        // Verify merged structure
        assert_eq!(merged_history.groups.len(), 6); // 3 from each client
        
        // Verify chronological ordering after merge
        for i in 1..merged_history.groups.len() {
            assert!(merged_history.groups[i-1].time <= merged_history.groups[i].time);
        }
        
        // Verify timeline: A(0) -> B(1) -> A(2) -> B(3) -> A(4) -> B(5)
        let times: Vec<_> = merged_history.groups.iter()
            .map(|g| g.time.duration_since(base_time).unwrap().as_secs())
            .collect();
        assert_eq!(times, vec![0, 60, 120, 180, 240, 300]);
        
        // Test the merged result
        let bibles = create_test_bibles_map();
        let save = merged_history.to_save(&bibles);
        
        // Verify both notebooks exist
        assert!(save.notebooks.contains_key("client-a-notebook"));
        assert!(save.notebooks.contains_key("client-b-notebook"));
        
        let notebook_a = &save.notebooks["client-a-notebook"];
        let notebook_b = &save.notebooks["client-b-notebook"];
        
        // Verify Client A's final state
        assert_eq!(notebook_a.notes.len(), 1);
        assert_eq!(notebook_a.highlight_categories.len(), 1);
        assert_eq!(notebook_a.highlight_categories["highlight-yellow"].name, "Very Important");
        
        // Verify Client B's final state  
        assert_eq!(notebook_b.notes.len(), 1);
        assert_eq!(notebook_b.highlight_categories.len(), 2); // green and blue
        assert!(notebook_b.highlight_categories.contains_key("highlight-green"));
        assert!(notebook_b.highlight_categories.contains_key("highlight-blue"));
        
        println!("✓ Action history merge test passed");
        println!("  - Merged {} groups in chronological order", merged_history.groups.len());
        println!("  - Client A notebook: {} notes, {} highlights", 
                 notebook_a.notes.len(), notebook_a.highlight_categories.len());
        println!("  - Client B notebook: {} notes, {} highlights", 
                 notebook_b.notes.len(), notebook_b.highlight_categories.len());
    }

    #[test]
    fn test_merge_with_duplicate_ids() {
        let base_time = SystemTime::now();
        
        // Create two histories with some duplicate action group IDs
        let mut history1 = ActionHistory::new();
        let mut history2 = ActionHistory::new();
        
        let shared_id = Uuid::new_v4();
        
        // Both histories have a group with the same ID (simulating race condition)
        let group1 = ActionGroup {
            id: shared_id,
            actions: vec![Action {
                notebook: "test".to_string(),
                bible_name: "Test Bible".to_string(),
                action: ActionType::CreateHighlight(create_highlight_category(
                    "test-highlight", "Test", Color { r: 255, g: 0, b: 0 }, 1
                )),
            }],
            time: base_time,
        };
        
        let group2 = ActionGroup {
            id: shared_id, // Same ID
            actions: vec![Action {
                notebook: "test".to_string(),
                bible_name: "Test Bible".to_string(),
                action: ActionType::CreateNote(create_note("test-note", "Test note", 0, 1)),
            }],
            time: base_time + Duration::from_secs(60),
        };
        
        history1.push(group1);
        history2.push(group2);
        
        // Merge should deduplicate by ID
        let merged = ActionHistory::merge(history1, history2);
        
        // Should only have one group (duplicates removed)
        assert_eq!(merged.groups.len(), 1);
        assert_eq!(merged.groups[0].id, shared_id);
        
        println!("✓ Merge deduplication test passed");
    }

    #[test]
    fn test_concurrent_editing_scenario() {
        let base_time = SystemTime::now();
        
        // Simulate a more realistic scenario where both clients edit the same resources
        let mut client1_history = ActionHistory::new();
        let mut client2_history = ActionHistory::new();
        
        // Both clients create highlight categories at the same time
        let group1a = ActionGroup {
            id: Uuid::new_v4(),
            actions: vec![Action {
                notebook: "shared-notebook".to_string(),
                bible_name: "Test Bible".to_string(),
                action: ActionType::CreateHighlight(create_highlight_category(
                    "shared-highlight", "Important", Color { r: 255, g: 0, b: 0 }, 1
                )),
            }],
            time: base_time,
        };
        
        let group1b = ActionGroup {
            id: Uuid::new_v4(),
            actions: vec![Action {
                notebook: "shared-notebook".to_string(),
                bible_name: "Test Bible".to_string(),
                action: ActionType::EditHighlight(create_highlight_category(
                    "shared-highlight", "Very Important", Color { r: 255, g: 100, b: 0 }, 1
                )),
            }],
            time: base_time + Duration::from_secs(30),
        };
        
        client1_history.push(group1a);
        client2_history.push(group1b);
        
        // Merge and test
        let merged = ActionHistory::merge(client1_history, client2_history);
        let bibles = create_test_bibles_map();
        let save = merged.to_save(&bibles);
        
        let notebook = &save.notebooks["shared-notebook"];
        
        // The later edit should win
        assert_eq!(notebook.highlight_categories.len(), 1);
        assert_eq!(notebook.highlight_categories["shared-highlight"].name, "Very Important");
        assert_eq!(notebook.highlight_categories["shared-highlight"].color.g, 100);
        
        println!("✓ Concurrent editing scenario test passed");
    }
}