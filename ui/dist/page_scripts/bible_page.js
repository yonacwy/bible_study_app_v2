import * as utils from "../utils.js";
import * as bible from "../bible.js";
import * as bible_renderer from "../rendering/bible_render.js";
import * as pages from "./pages.js";
import * as view_states from "../view_states.js";
import { ERASER_STATE_NAME } from "../save_states.js";
import * as side_popup from "../side_popup.js";
const CONTENT_ID = "chapter-text-content";
const CHAPTER_NAME_ID = "chapter-name";
const NEXT_CHAPTER_BUTTON_ID = "next-chapter-btn";
const PREVIOUS_CHAPTER_BUTTON_ID = "previous-chapter-btn";
export async function run() {
    let data = utils.decode_from_url(window.location.href);
    utils.init_format_copy_event_listener();
    Promise.all([
        pages.init_nav_buttons(),
        pages.init_chapter_selection_dropdown(),
        pages.init_highlight_editor_button(),
        pages.init_highlight_selection(null),
        pages.update_nav_buttons_opacity(),
        pages.init_search_bar(),
        utils.init_toggle('erase-highlight-toggle', ERASER_STATE_NAME, _ => { }),
        side_popup.init_popup_panel('popup-panel'),
        init_chapter_buttons(),
        display_chapter({ book: data.book, number: data.chapter }, data.verse_range),
    ]).then(_ => {
        document.body.style.visibility = 'visible';
    });
}
async function display_chapter(chapter, verse_range) {
    const content = document.getElementById(CONTENT_ID);
    const word_popup = document.getElementById(pages.WORD_POPUP_ID);
    const popup_panel = document.getElementById(pages.POPUP_PANEL_ID);
    const popup_panel_content = document.getElementById(pages.POPUP_PANEL_CONTENT_ID);
    if (content === null || word_popup === null || popup_panel === null || popup_panel_content === null) {
        return;
    }
    let chapter_view = await bible.load_view();
    let name = chapter_view[chapter.book].name;
    let number = chapter.number + 1;
    utils.set_value(pages.SEARCH_INPUT_ID, `${name} ${number}`);
    utils.set_html(CHAPTER_NAME_ID, `${name} ${number}`);
    bible_renderer.render_current_chapter(content, word_popup, popup_panel, popup_panel_content, pages.update_word_selection).then(() => {
        if (verse_range !== null) {
            let start = verse_range.start;
            let element = document.getElementById(CONTENT_ID)?.getElementsByClassName(`verse-index-${start}`)[0];
            if (element !== undefined) {
                element.scrollIntoView();
                window.scrollBy(0, -40);
            }
        }
        pages.update_word_selection();
    });
}
async function init_chapter_buttons() {
    utils.on_click(PREVIOUS_CHAPTER_BUTTON_ID, e => {
        bible.to_previous_chapter().then(() => {
            utils.reset_scroll();
            view_states.goto_current_view_state();
        });
    });
    utils.on_click(NEXT_CHAPTER_BUTTON_ID, e => {
        bible.to_next_chapter().then(() => {
            utils.reset_scroll();
            view_states.goto_current_view_state();
        });
    });
}
