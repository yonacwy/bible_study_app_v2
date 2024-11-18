import * as utils from "../utils/index.js";
import * as bible from "../bible.js";
import * as bible_renderer from "../rendering/bible_render.js";
import { BibleSection, ChapterIndex, HighlightCategory, VerseRange } from "../bindings.js";
import * as pages from "./pages.js";
import * as view_states from "../view_states.js";
import * as side_popup from "../popups/side_popup.js";
import * as context_menu from "../popups/context_menu.js";
import * as highlights from "../highlights.js";
import { ContextMenuCommand } from "../popups/context_menu.js";

const CONTENT_ID: string = "chapter-text-content";
const CHAPTER_NAME_ID: string = "chapter-name"

const NEXT_CHAPTER_BUTTON_ID: string = "next-chapter-btn";
const PREVIOUS_CHAPTER_BUTTON_ID: string = "previous-chapter-btn";

export async function run()
{
    let data = utils.decode_from_url(window.location.href) as BibleSection;
    utils.init_format_copy_event_listener();

    Promise.all([
        pages.init_header(),
        pages.init_context_menu(),
        init_chapter_buttons(),
        display_chapter({book: data.book, number: data.chapter}, data.verse_range),
        
    ]).then(_ => {
        document.body.style.visibility = 'visible';
    });
}

export async function display_chapter(chapter: ChapterIndex, verse_range: VerseRange | null)
{
    const content = document.getElementById(CONTENT_ID);
    const word_popup = document.getElementById(pages.WORD_POPUP_ID);
    const popup_panel = document.getElementById(pages.POPUP_PANEL_ID);
    const popup_panel_content = document.getElementById(pages.POPUP_PANEL_CONTENT_ID);

    if(content === null || word_popup === null) { return; }
    content.replaceChildren();

    let panel_data: side_popup.PanelData | null = null;
    if(popup_panel && popup_panel_content)
    {
        panel_data = {
            popup_panel: popup_panel,
            popup_panel_content: popup_panel_content
        };
    }

    let chapter_view = await bible.load_view();
    
    let name = chapter_view[chapter.book].name;
    let number = chapter.number + 1;
    
    utils.set_value(pages.SEARCH_INPUT_ID, `${name} ${number}`);
    utils.set_html(CHAPTER_NAME_ID, `${name} ${number}`);

    let on_search = (msg: string): void => {
        utils.set_value('search-input', msg);
        document.getElementById('search-btn')?.click();
    }

    return bible_renderer.render_chapter(chapter, content, word_popup, panel_data, pages.update_word_selection, on_search).then(() => {
        if(verse_range !== null)
        {
            let start = verse_range.start;
            let element = document.getElementById(CONTENT_ID)?.getElementsByClassName(`verse-index-${start}`)[0];
            if (element !== undefined)
            {
                element.scrollIntoView();
                window.scrollBy(0, -40);
            }
        }

        pages.update_word_selection();
    });
}

export async function init_chapter_buttons()
{
    utils.on_click(PREVIOUS_CHAPTER_BUTTON_ID, e => {
        bible.to_previous_chapter().then(() => {
            utils.reset_scroll();
            view_states.goto_current_view_state();
        })
    });

    utils.on_click(NEXT_CHAPTER_BUTTON_ID, e => {
        bible.to_next_chapter().then(() => {
            utils.reset_scroll();
            view_states.goto_current_view_state();
        })
    })
}