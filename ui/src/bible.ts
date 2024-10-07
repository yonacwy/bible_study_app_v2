import { invoke, debug_print, color_to_hex, trim_string, capitalize_first_char } from "./utils.js";
import { get_catagories, get_selected_highlight } from "./highlights.js";
import { push_section, get_current_view_state } from "./view_states.js";
import { ChapterIndex } from "./bindings.js";

export async function load_view(): Promise<any>
{
    let str = await invoke('get_bible_view', {});
    let view = JSON.parse(str);
    return view;
}

export async function get_chapter_view(): Promise<any>
{
    let current = get_chapter();
    let str = await invoke('get_chapter_view', { chapter: current });
    let view = JSON.parse(str);
    return view;
}

export async function get_chapter(): Promise<any>
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

export async function create_highlight_selection(on_selected: (id: string | null) => void) 
{
    let highlight_data = await get_catagories();
    let container = document.getElementById('highlights-dropdown');
    let current_highlight_id = get_selected_highlight();

    if(container === null) return;

    let highlight_catagories: any[] = [];
    for(let id in highlight_data)
    {
        highlight_catagories.push(highlight_data[id]);
    }

    highlight_catagories = highlight_catagories.sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
    })

    for(let i = 0; i < highlight_catagories.length; i++)
    {
        let highlight = highlight_catagories[i];

        let highlight_div = document.createElement('div');
        highlight_div.classList.add('dropdown-option');
        if(highlight.id === current_highlight_id)
        {
            highlight_div.classList.add('selected-option');
        }
        
        let span = document.createElement('span');
        span.innerHTML = highlight.name;
        highlight_div.appendChild(span);

        let color_div = document.createElement('div');
        color_div.style.backgroundColor = color_to_hex(highlight.color);
        color_div.classList.add('color-square');
        highlight_div.appendChild(color_div);

        highlight_div.addEventListener('click', e => {
            let nodes = container.getElementsByClassName('dropdown-option');
            for (let i = 0; i < nodes.length; i++)
            {
                nodes[i].classList.remove('selected-option');
            }

            highlight_div.classList.add('selected-option');
            on_selected(highlight.id);
        });

        container.appendChild(highlight_div);
    }

    let none_div = document.createElement('div');
    none_div.classList.add('dropdown-option');
    if(current_highlight_id === null)
    {
        none_div.classList.add('selected-option');
    }

    let span = document.createElement('span');
    span.innerHTML = 'None';
    none_div.appendChild(span);

    none_div.addEventListener('click', e => {
        let nodes = container.getElementsByClassName('dropdown-option');
        for (let i = 0; i < nodes.length; i++)
        {
            nodes[i].classList.remove('selected-option');
        }

        none_div.classList.add('selected-option');
        on_selected(null);
    });

    container.appendChild(none_div);
    on_selected(null);
}

export async function to_next_chapter(): Promise<void>
{
    let current_chapter = await get_chapter();
    let view = await load_view();

    if(current_chapter.number < view[current_chapter.book].chapterCount - 1)
    {
        current_chapter.number++;
    }
    else if(current_chapter.book < view.length)
    {
        current_chapter.book++;
        current_chapter.number = 0;
    }

    return push_section({
        book: current_chapter.book,
        chapter: current_chapter.number,
        verseRange: null
    });
}

export async function to_previous_chapter(): Promise<void>
{
    let current_chapter = await get_chapter();
    let view = await load_view();

    if(current_chapter.number > 0)
    {
        current_chapter.number--;
    }
    else if(current_chapter.book > 0)
    {
        current_chapter.book--;
        current_chapter.number = view[current_chapter.book].chapterCount - 1;
    }

    return push_section({
        book: current_chapter.book,
        chapter: current_chapter.number,
        verseRange: null
    });
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