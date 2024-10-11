import * as bible from "../bible.js";
import * as verse_renderer from "./verse_rendering.js";
export const HIGHLIGHT_SELECTED_WORD_COLOR = 'blueviolet';
let was_initialized = false;
export async function render_chapter(chapter, content, word_popup, popup_panel, popup_panel_content, on_render) {
    content.style.pointerEvents = 'none';
    if (!was_initialized) {
        was_initialized = true;
        let on_require_rerender = () => render_chapter(chapter, content, word_popup, popup_panel, popup_panel_content, on_render);
        verse_renderer.init_highlighting(popup_panel, on_require_rerender);
    }
    let chapter_ol = document.createElement('ol');
    let view = await bible.get_chapter_view(chapter);
    for (let verse_index = 0; verse_index < view.verses.length; verse_index++) {
        let verse_li = document.createElement('li');
        verse_li.classList.add(`verse-index-${verse_index}`);
        let elements = await verse_renderer.render_verse({
            chapter: chapter,
            verse: verse_index,
            word_popup: word_popup,
            side_popup: popup_panel,
            side_popup_content: popup_panel_content,
            bolded: [],
        });
        verse_li.append(...elements);
        chapter_ol.appendChild(verse_li);
    }
    content.replaceChildren(chapter_ol);
    content.style.pointerEvents = 'auto';
    if (on_render !== null) {
        on_render();
    }
}
export async function render_current_chapter(content, word_popup, popup_panel, popup_panel_content, on_render) {
    let chapter = await bible.get_chapter();
    return await render_chapter(chapter, content, word_popup, popup_panel, popup_panel_content, on_render);
}
