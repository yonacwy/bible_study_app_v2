import { BibleSection } from "./bindings.js";
import * as utils from "./utils.js";

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

export async function push_section(section: BibleSection)
{
    return await utils.invoke('push_view_state', { viewState: {
        type: 'chapter',
        chapter: {
            book: section.book,
            number: section.chapter
        },
        verseRange: section.verseRange,
        scroll: 0.0
    }});
}

export async function push_search(words: string[], display_index: number)
{
    return await utils.invoke('push_view_state', { viewState: {
        type: 'search',
        words: words,
        displayIndex: display_index,
        scroll: 0.0
    }});
}

export async function get_current_view_state(): Promise<any>
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