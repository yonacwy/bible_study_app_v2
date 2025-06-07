import { BibleSection, ChapterIndex, SearchSection, VerseRange } from "./bindings.js";
import * as utils from "./utils/index.js";
import * as notes from "./notes.js";
import { BibleNotePageData } from "./page_scripts/bible_note_page.js";
import { SearchNotePageData } from "./page_scripts/search_note_page.js";

export async function is_last_view_state(): Promise<boolean>
{
    let count = await utils.invoke('get_view_state_count', {});
    let current = await utils.invoke('get_view_state_index', {});
    return current >= count - 1;
}

export async function is_first_view_state(): Promise<boolean>
{
    let current = await utils.invoke('get_view_state_index', {});
    return current <= 0;
}

export async function push_section(section: BibleSection): Promise<void>
{
    return await utils.invoke('push_view_state', { view_state: {
        type: 'chapter',
        chapter: {
            book: section.book,
            number: section.chapter
        },
        verse_range: section.verse_range,
        scroll: 0.0
    }});
}

export async function push_search(words: string[], display_index: number): Promise<void>
{
    return await utils.invoke('push_view_state', { view_state: {
        type: 'search',
        words: words,
        display_index: display_index,
        scroll: 0.0
    }});
}

export async function push_highlights()
{
    return await utils.invoke('push_view_state', { view_state: {
        type: 'highlights'
    }});
}

export async function goto_current_view_state()
{
    let current = await get_current_view_state();
    let editing_note = await notes.get_editing_note();

    let base_path = window.location.pathname == '/' ? 'pages/' : ''

    if(current.type === 'chapter')
    {
        let data: BibleSection = {
            book: current.chapter.book,
            chapter: current.chapter.number,
            verse_range: current.verse_range
        };

        if(editing_note)
        {
            let note_page_data: BibleNotePageData = {
                section: data,
                note: editing_note
            };

            let url = utils.encode_to_url(base_path + 'bible_note_page.html', note_page_data);
            window.location.href = url;
        }
        else 
        {
            let url = utils.encode_to_url(base_path + 'bible_page.html', data);
            window.location.href = url;
        }
    }
    else if(current.type === 'search')
    {
        let data: SearchSection = {
            words: current.words,
            display_index: current.display_index
        };

        if(editing_note)
        {
            let note_page_data: SearchNotePageData = {
                section: data,
                note: editing_note
            };

            let url = utils.encode_to_url(base_path + 'search_note_page.html', note_page_data);
            window.location.href = url;
        }
        else 
        {
            let url = utils.encode_to_url(base_path + 'search_page.html', data);
            window.location.href = url;
        }
    }
}

export enum ViewStateType
{
    Chapter,
    Search,
}

export async function get_view_state_type(): Promise<ViewStateType | null>
{
    let current = await get_current_view_state();
    if (current.type == 'chapter')
    {
        return ViewStateType.Chapter;
    }
    else if (current.type == 'search')
    {
        return ViewStateType.Search;
    }
    else 
    {
        return null;
    }
}

export type ViewState =
  | {
      type: "chapter";
      chapter: ChapterIndex;
      verse_range: VerseRange | null;
      scroll: number;
    }
  | {
      type: "search";
      words: string[];
      display_index: number;
      scroll: number;
    };

export async function get_current_view_state(): Promise<ViewState>
{
    return await utils.invoke('get_current_view_state', {});
}

export async function next_view_state(): Promise<any>
{
    return await utils.invoke('to_next_view_state', {});
}

export async function previous_view_state(): Promise<any>
{
    return await utils.invoke('to_previous_view_state', {});
}

export async function clear_view_states(): Promise<void>
{
    return await utils.invoke('clear_view_states', {});
}

export async function push_search_query(text: string): Promise<boolean>
{
    return utils.invoke('parse_bible_search', { text: text }).then(async result => {

        if(result.type === 'error')
        {
            return false;
        }
        else if(result.type === 'word')
        {
            return await push_search(result.words, 0).then(_ => true);
        }
        else if (result.type === 'section')
        {
            return await push_section(result.section).then(_ => true);
        }
        else 
        {
            return false;
        }
    });
}