import { get_chapter } from "./bible.js";
import { ChapterAnnotations, ChapterIndex, HighlightCategories, HighlightCategory, NoteSourceType } from "./bindings.js";
import * as utils from "./utils/index.js";

export function create_category(color: string, name: string, description: string | null, source_type: NoteSourceType, priority: string)
{
    utils.invoke('add_highlight_category', {
        color: color,
        name: name,
        description: description ?? "",
        priority: priority,
        source_type: source_type,
    });
}

export function set_category(id: string, color: string, name: string, description: string, source_type: NoteSourceType, priority: number)
{
    utils.invoke('set_highlight_category', {
        id: id,
        color: color,
        name: name,
        description: description,
        priority: priority.toString(),
        source_type: source_type,
    });
}

export async function get_categories(): Promise<HighlightCategories>
{
    return JSON.parse(await utils.invoke('get_highlight_categories', {}));
}

export async function get_sorted_categories(): Promise<HighlightCategory[]>
{
    return get_categories().then(cats => {
        return Object.values(cats).sort((a, b) => {
            if (a.name === b.name)
            {
                return a.id > b.id ? 1 : -1;
            }

            return a.name > b.name ? 1 : -1;
        });
    })
}

export function sort_highlights(categories: HighlightCategory[]): HighlightCategory[]
{
    return categories.sort((a, b) => {
        if (a.name === b.name)
        {
            return a.id > b.id ? 1 : -1;
        }

        return a.name > b.name ? 1 : -1;
    });
}

export async function get_chapter_annotations(chapter: ChapterIndex): Promise<ChapterAnnotations>
{
    let annotations_json = await utils.invoke('get_chapter_annotations', { chapter: chapter });
    return JSON.parse(annotations_json);
}

export async function highlight_word(chapter: any, word_pos: number, highlight_id: string) 
{
    if(highlight_id !== null && highlight_id !== undefined)
    {
        utils.invoke('highlight_word', {
            chapter: chapter,
            word_position: word_pos,
            highlight_id: highlight_id,
        });
    }
}

export async function highlight_chapter_word(chapter: ChapterIndex, word_pos: number, highlight_id: string) 
{
    if(highlight_id !== null && highlight_id !== undefined)
    {
        utils.invoke('highlight_word', {
            chapter: chapter,
            word_position: word_pos,
            highlight_id: highlight_id,
        });
    }
}

export async function erase_highlight(chapter: any, word_index: number, highlight_id: string) 
{
    if(highlight_id !== null && highlight_id !== undefined)
    {
        utils.invoke('erase_highlight', {
            chapter: chapter,
            word_position: word_index,
            highlight_id: highlight_id,
        });
    }
}

export async function erase_chapter_highlight(chapter: ChapterIndex, word_pos: number, highlight_id: string) 
{
    utils.debug_print(`erasing highlight ${highlight_id}`);
    utils.invoke('erase_highlight', {
        chapter: chapter,
        word_position: word_pos,
        highlight_id: highlight_id,
    });
}