import { NoteData, NoteSourceType, ReferenceLocation } from "./bindings.js";
import * as utils from "./utils/index.js";
import * as bible from "./bible.js";

const CREATED_NOTE_STORAGE: utils.storage.ValueStorage<ReferenceLocation> = new utils.storage.ValueStorage<ReferenceLocation>("created-note");
// Will return true ONCE when called after creating a note. 
// All subsequent calls before creating another note will return null
export function get_did_create_note(): ReferenceLocation | null
{
    let value = CREATED_NOTE_STORAGE.get();
    if (value !== null)
    {
        CREATED_NOTE_STORAGE.set(null);
        return value;
    }

    return null;
}

export async function get_note(id: string): Promise<NoteData>
{
    return JSON.parse(await utils.invoke('get_note', { id: id }));
}

export async function update_note(id: string, locations: ReferenceLocation[], text: string, source_type: NoteSourceType): Promise<void>
{
    return await utils.invoke('update_note', { id: id, locations: locations, text: text, source_type: source_type });
}

export async function delete_note(id: string): Promise<void>
{
    return await utils.invoke('remove_note', { id: id });
}

export async function create_note(location: ReferenceLocation): Promise<string>
{
    CREATED_NOTE_STORAGE.set(location);
    let source_type: NoteSourceType = 'json';
    return await utils.invoke('add_note', { text: '', locations: [location], source_type: source_type});
}

export async function get_editing_note(): Promise<string | null>
{
    return await utils.invoke('get_editing_note', {}) as string | null
}

export async function set_editing_note(note: string | null): Promise<void>
{
    return await utils.invoke('set_editing_note', { note: note })
}

export async function get_note_references(note_data: NoteData): Promise<[string, string][]>
{
    let references: [string, string][] = [];
    let bible_view = await bible.get_bible_view();

    for(let i = 0; i < note_data.locations.length; i++)
    {
        let location = note_data.locations[i];
        let view = await bible.get_chapter_view(location.chapter);
        let start = bible.flatten_verse_index(view, location.range.verse_start, location.range.word_start);
        let end = bible.flatten_verse_index(view, location.range.verse_end, location.range.word_end);

        let words = await bible.get_chapter_words(location.chapter);
        let text = words.slice(start, end + 1).join(' ').limit_length(30, '...');
        let name = bible.shorten_book_name(bible_view[location.chapter.book].name); 

        let title = `${name} ${location.chapter.number + 1}:${location.range.verse_start + 1}`;
        if(location.range.verse_start !== location.range.verse_end)
        {
            title += `-${location.range.verse_end + 1}`;
        }

        references.push([title, text.valueOf()]);
    }

    return references;
}