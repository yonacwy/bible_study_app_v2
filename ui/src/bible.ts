import { invoke, debug_print, color_to_hex, trim_string, capitalize_first_char } from "./utils/index.js";
import { push_section, get_current_view_state } from "./view_states.js";
import { BookView, ChapterIndex, ChapterView } from "./bindings.js";
import { EventListeners, Listener } from "./utils/events.js";

export async function load_view(): Promise<BookView[]>
{
    let str = await invoke('get_bible_view', {});
    let view = JSON.parse(str);
    return view;
}

export async function get_chapter_view(chapter: ChapterIndex): Promise<ChapterView>
{
    let str = await invoke('get_chapter_view', { chapter: chapter });
    let view = JSON.parse(str);
    return view;
}

export async function get_chapter(): Promise<ChapterIndex | null>
{
    let view_state = await get_current_view_state();
    if(view_state.type !== 'chapter')
    {
        debug_print('tried to get non chapter view state');
        return null;
    }

    return view_state.chapter;
}

export async function get_chapter_words(chapter: ChapterIndex): Promise<string[]>
{
    let chapter_text = JSON.parse(await invoke('get_chapter_text', { chapter: chapter }));

    let words: string[] = [];
    for(let v = 0; v < chapter_text.verses.length; v++)
    {
        let verse = chapter_text.verses[v];
        for(let w = 0; w < verse.words.length; w++)
        {
            let word = trim_string(verse.words[w].text);
            words.push(word);
        }
    }

    return words;
}

export async function to_next_chapter(): Promise<void>
{
    let current_chapter = await get_chapter();
    if (!current_chapter) return;

    let view = await load_view();

    if(current_chapter.number < view[current_chapter.book].chapter_count - 1)
    {
        current_chapter.number++;
    }
    else if(current_chapter.book < view.length - 1)
    {
        current_chapter.book++;
        current_chapter.number = 0;
    }

    return push_section({
        book: current_chapter.book,
        chapter: current_chapter.number,
        verse_range: null
    });
}

export async function to_previous_chapter(): Promise<void>
{
    let current_chapter = await get_chapter();
    if (!current_chapter) return;

    let view = await load_view();

    if(current_chapter.number > 0)
    {
        current_chapter.number--;
    }
    else if(current_chapter.book > 0)
    {
        current_chapter.book--;
        current_chapter.number = view[current_chapter.book].chapter_count - 1;
    }

    return push_section({
        book: current_chapter.book,
        chapter: current_chapter.number,
        verse_range: null
    });
}

export async function get_current_bible_version(): Promise<string>
{
    return await invoke('get_current_bible_version', {});
}


const BIBLE_VERSION_CHANGE_EVENT_LISTENERS: EventListeners<string> = new EventListeners<string>();

export function add_version_changed_listener(listener: Listener<string>)
{
    BIBLE_VERSION_CHANGE_EVENT_LISTENERS.add_listener(listener);
}

export function set_bible_version(version: string)
{
    invoke('set_current_bible_version', { version: version }).then(_ => {
        BIBLE_VERSION_CHANGE_EVENT_LISTENERS.invoke(version);
    });
}

export async function get_bible_versions(): Promise<string[]>
{
    return await invoke('get_bible_versions', {});
}

export async function get_book_name(book_index: number): Promise<string>
{
    return await invoke('get_book_name', { book: book_index });
}

export async function get_verse_word_offset(book: number, chapter: number, verse_index: number): Promise<number>
{
    let view = JSON.parse(await invoke('get_chapter_view', { chapter: {
        book: book,
        number: chapter,
    }}));

    let offset = 0;
    for(let i = 0; i < verse_index; i++)
    {
        offset += view.verses[i];
    }

    return offset;
}

const SHORTENED_BOOK_NAME_LENGTH = 3;
export function shorten_book_name(name: string): string
{
    const regex = /(?<prefix>\d+)?\s*(?<suffix>\w+)/;
    const match = name.match(regex);

    if(match === null) return 'err';

    let prefix = '';
    if(match.groups?.prefix !== undefined)
    {
        prefix = `${match.groups.prefix} `;
    }

    let suffix = match.groups?.suffix.toLowerCase() ?? 'err';

    name = suffix;
    if(name === 'exodus')
    {
        name = 'ex'
    }
    else if(name === 'john')
    {
        name = 'jn';
    }

    name = name = name.length > SHORTENED_BOOK_NAME_LENGTH
        ? name.slice(0, SHORTENED_BOOK_NAME_LENGTH)
        : name;

    return prefix + capitalize_first_char(name);
}

export function expand_word_index(chapter: ChapterView, word_index: number): [number, number]
{
    let verse = 0;
    let word = word_index;

    while(word - chapter.verses[verse] >= 0)
    {
        word -= chapter.verses[verse];
        verse++;
    }

    return [verse, word];
}

export function flatten_verse_index(chapter: ChapterView, verse: number, word: number): number 
{
    let index = 0;
    for(let i = 0; i < verse; i++)
    {
        index += chapter.verses[i];
    }

    index += word;
    return index;
}

export async function get_book_index(prefix: number | null, name: string): Promise<number | null>
{
    return (await invoke('get_book_from_name', { prefix: prefix, name: name }))?.index ?? null;
}