import * as utils from "./utils.js";

export async function push_chapter(chapter)
{
    utils.debug_print(JSON.stringify(chapter));
    let value = await utils.invoke('push_view_state', { viewState: {
        type: 'chapter',
        chapter: chapter,
        scroll: 0.0
    }});

    utils.debug_print('got here');
    return value;
}

export async function push_highlights()
{
    return await utils.invoke('push_view_state', { view_state: {
        type: 'highlights'
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