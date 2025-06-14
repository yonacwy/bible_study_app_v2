// ---------------------- Bible Bindings ----------------------
export type Word = { text: string, italicized: boolean, red: boolean };

export type Verse = { words: Array<Word> };
export type Chapter = { verses: Array<Verse> };

export type ChapterIndex = { book: number, number: number };
export type VerseRange = { start: number, end: number };
export type WordRange = { verse_start: number, word_start: number, verse_end: number, word_end: number };
export type ReferenceLocation = { chapter: ChapterIndex, range: WordRange };
export type VersePosition = { book: number, chapter: number, verse: number};

export type BookView = { name: string, chapter_count: number };
export type ChapterView = { verses: Array<number> };

// ---------------------- Note Bindings -----------------------
export type HighlightCategories = { [key: string]: HighlightCategory }
export type HighlightCategory = { color: Color, name: string, description: string, priority: number, source_type: NoteSourceType, id: string };
export type NoteSourceType = 'html' | 'json' | 'markdown';
export type NoteData = { id: string, text: string, locations: Array<ReferenceLocation>, source_type: NoteSourceType };
export type WordAnnotations = { highlights: Array<string>, notes: Array<string> };
export type ChapterAnnotations = { [key: number]: WordAnnotations | undefined };

// ------------------------ Misc Bindings ----------------------------
export type Color = { r: number, g: number, b: number };
export type BibleSection = { book: number, chapter: number, verse_range: VerseRange | null };
export type SearchSection = { words: string[], display_index: number, editing_note_location: ReferenceLocation | null };
export type AppSettings = { ui_scale: number, volume: number, font: string | null };