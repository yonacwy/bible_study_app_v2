import * as utils from "../utils.js";
import * as bible from "../bible.js";
import * as bible_renderer from "../bible_render.js";
import * as pages from "./pages.js";
import { build_chapter_selection_dropdown } from "../selection.js";
const CONTENT_ID = "chapter-text-content";
const CHAPTER_NAME_ID = "chapter-name";
const CHAPTER_SELECTOR_ID = "book-selection-content";
const NEXT_CHAPTER_BUTTON_ID = "next-chapter-btn";
const PREVIOUS_CHAPTER_BUTTON_ID = "previous-chapter-btn";
export async function run() {
    let data = utils.decode_from_url(window.location.href);
    init_chapter_selection_dropdown();
    init_chapter_buttons();
    pages.init_highlight_selection(null);
    pages.init_search_enter();
    pages.init_nav_buttons();
    utils.init_format_copy_event_listener();
    display_chapter({ book: data.book, number: data.chapter }, data.verseRange);
}
async function display_chapter(chapter, verse_range) {
    let chapter_view = await bible.load_view();
    let name = chapter_view[chapter.book].name;
    let number = chapter.number + 1;
    utils.set_value(pages.SEARCH_INPUT_ID, `${name} ${number}`);
    utils.set_html(CHAPTER_NAME_ID, `${name} ${number}`);
    bible_renderer.render_current_chapter(CONTENT_ID, pages.WORD_POPUP_ID, pages.POPUP_PANEL_ID, pages.update_word_selection).then(() => {
        if (verse_range !== null) {
            let start = verse_range.start;
            let element = document.getElementById(CONTENT_ID)?.getElementsByClassName(`verse-index-${start}`)[0];
            if (element !== undefined) {
                element.scrollIntoView();
                window.scrollBy(0, -25);
            }
        }
        pages.update_word_selection();
    });
}
async function init_chapter_selection_dropdown() {
    build_chapter_selection_dropdown(CHAPTER_SELECTOR_ID, (name, number) => {
        utils.set_value(pages.SEARCH_INPUT_ID, `${name} ${number}`);
        document.getElementById(pages.SEARCH_BUTTON_ID)?.click();
    });
}
async function init_chapter_buttons() {
    utils.on_click(NEXT_CHAPTER_BUTTON_ID, e => {
        bible.to_previous_chapter().then(() => {
            utils.reset_scroll();
            utils.debug_print('going to next chapter');
        });
    });
    utils.on_click(PREVIOUS_CHAPTER_BUTTON_ID, e => {
        bible.to_next_chapter().then(() => {
            utils.reset_scroll();
            utils.debug_print('going to previous chapter');
        });
    });
}
