import * as bible from "../bible.js";
import { ChapterIndex, Color } from "../bindings.js";
import * as verse_renderer from "./verse_rendering.js";
import * as utils from "../utils/index.js";
import { PanelData } from "../popups/side_popup.js";
import * as word_select from "../word_select.js";
import * as selection from "../selection.js";


export const HIGHLIGHT_SELECTED_WORD_COLOR = 'blueviolet';
let was_initialized = false;

export async function render_chapter(chapter: ChapterIndex, content: HTMLElement, word_popup: HTMLElement, panel_data: PanelData | null, on_render: (() => void), on_search: (msg: string) => void)
{
    content.style.pointerEvents = 'none';

    if(!was_initialized)
    {
        was_initialized = true;
        let on_require_rerender = () => render_chapter(chapter, content, word_popup, panel_data, on_render, on_search);
        word_select.init_word_selection(panel_data?.popup_panel ?? null, on_require_rerender);
        
        selection.init_selection();
        selection.ON_SELECTION_EVENT.add_listener(e => {
            on_require_rerender();
        });
    }

    word_select.clear_selection_ranges();
    let chapter_ol = document.createElement('ol');
    let view = await bible.get_chapter_view(chapter);

    for (let verse_index = 0; verse_index < view.verses.length; verse_index++)
    {
        let verse_li = document.createElement('li');
        verse_li.classList.add(`verse-index-${verse_index}`);

        let elements = await verse_renderer.render_verse({
            chapter: chapter,
            verse: verse_index,
            word_popup: word_popup,
            side_popup_data: panel_data,
            bolded: [],
            on_search: on_search
        })
        
        verse_li.append(...elements);
        chapter_ol.appendChild(verse_li);
    }

    content.replaceChildren(chapter_ol);
    content.style.pointerEvents = 'auto';

    word_select.push_selection_range(content, chapter, 0);
    word_select.update_words_for_selection();
    selection.push_selection_range(content, chapter, 0);

    if(on_render !== null)
    {
        on_render();
    }
}

export async function render_current_chapter(content: HTMLElement, word_popup: HTMLElement, panel_data: PanelData | null, on_render: (() => void), on_search: (msg: string) => void): Promise<void>
{
    let chapter = await bible.get_chapter() as ChapterIndex;
    return await render_chapter(chapter, content, word_popup, panel_data, on_render, on_search);
}