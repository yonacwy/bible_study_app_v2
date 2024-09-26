import * as utils from "./utils.js";

export async function is_last_view_state()
{
    let count = await utils.invoke('get_view_state_count');
    let current = await utils.invoke('get_view_state_index');
    return current >= count;
}

export async function is_first_view_state() 
{
    let current = await utils.invoke('get_view_state_index');
    return current <= 0;
}

export async function push_chapter(chapter, verse_range = null)
{
    return await utils.invoke('push_view_state', { viewState: {
        type: 'chapter',
        chapter: chapter,
        verse_range: verse_range,
        scroll: 0.0
    }});
}

export async function push_search(text)
{
    return await utils.invoke('push_view_state', { viewState: {
        type: 'search',
        text: text,
        scroll: 0.0
    }});
}

export async function get_current_view_state()
{
    return await utils.invoke('get_current_view_state');
}