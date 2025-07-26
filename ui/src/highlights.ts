import { get_chapter } from "./bible.js";
import { ChapterAnnotations, ChapterIndex, HighlightCategories, HighlightCategory, NoteSourceType, ReferenceLocation } from "./bindings.js";
import * as utils from "./utils/index.js";

export async function create_category(color: string, name: string, description: string | null, source_type: NoteSourceType, priority: string): Promise<void>
{
    return await utils.invoke('add_highlight_category', {
        color: color,
        name: name,
        description: description ?? "",
        priority: priority,
        source_type: source_type,
    });
}

export async function set_category(id: string, color: string, name: string, description: string, source_type: NoteSourceType, priority: number): Promise<void>
{
    return await utils.invoke('set_highlight_category', {
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

export async function highlight_location(location: ReferenceLocation, highlight_id: string): Promise<void>
{
    if(highlight_id !== null && highlight_id !== undefined)
    {
        return await utils.invoke('highlight_location', {
            location: location,
            highlight_id: highlight_id,
        });
    }
}

export async function erase_location_highlight(location: ReferenceLocation, highlight_id: string): Promise<void>
{
    if(highlight_id !== null && highlight_id !== undefined)
    {
        return await utils.invoke('erase_location_highlight', {
            location: location,
            highlight_id: highlight_id,
        });
    }
}

export const MAX_RECENT_HIGHLIGHT_COUNT: number = 3;

export async function push_recent_highlight(id: string): Promise<string[]> {
    let highlights_stack = await get_recent_highlights();

    // Remove the ID if it already exists
    highlights_stack = highlights_stack.filter(h => h !== id);

    // Add the new ID to the front (most recent)
    highlights_stack.unshift(id);

    // Enforce the max limit from the back (oldest)
    while (highlights_stack.length > MAX_RECENT_HIGHLIGHT_COUNT) {
        highlights_stack.pop();
    }

    await set_recent_highlights(highlights_stack);
    return highlights_stack;
}

export async function clear_recent_highlights(): Promise<void> {
    return await set_recent_highlights([]);
}

export async function get_recent_highlights(): Promise<string[]> {
    return await utils.invoke('get_recent_highlights', {});
}

async function set_recent_highlights(highlights: string[]): Promise<void> {
    return await utils.invoke('set_recent_highlights', { recent_highlights: highlights }).then(_ => {});
}
