import * as highlight_utils from "../highlights.js";
import * as utils from "../utils/index.js";
import * as view_states from "../view_states.js";
import { show_error_popup } from "../popups/error_popup.js";
import * as side_popup from "../popups/side_popup.js";
import { init_word_popup } from "../popups/word_popup.js";
import * as context_menu from "../popups/context_menu.js";
import { ContextMenuCommand } from "../popups/context_menu.js";
import { HighlightCategory } from "../bindings.js";
import { init_main_page_header, MainPageHeaderData } from "./menu_header.js";
import * as settings from '../settings.js';
import * as bible from '../bible.js';
import { get_editing_note } from "../notes.js";

export const SEARCH_INPUT_ID: string = "search-input";
export const SEARCH_BUTTON_ID: string = "search-btn";
export const BACK_BUTTON_ID: string = "back-btn";
export const FORWARD_BUTTON_ID: string = "forward-btn";
export const POPUP_PANEL_ID: string = "popup-panel";
export const POPUP_PANEL_CONTENT_ID: string = "popup-panel-content";
export const WORD_POPUP_ID: string = "word-popup";
export const HIGHLIGHT_SELECTOR_ID: string = "highlight-selector-btn";
export const HIGHLIGHT_EDITOR_BUTTON_ID: string = "highlight-settings";

const CHAPTER_SELECTOR_ID: string = "book-selection-content";

export async function init_header(extra?: (e: HTMLElement) => void): Promise<MainPageHeaderData>
{
    let main_page_data = init_main_page_header({
        extra,
        old_path: window.location.href,
    });

    let word_popup = document.getElementById(WORD_POPUP_ID);
    if(word_popup !== null)
    {
        init_word_popup(word_popup);
    }

    // Used so that it reloads the page when the bible version is changed
    bible.add_version_changed_listener(async _ => {
        // Cant do location.reload(), because if we are editing the note, the editing note is set to null, and we need to account for that
        view_states.goto_current_view_state();
    });

    return await Promise.all([
        side_popup.init_popup_panel('popup-panel'),
        utils.display_migration_popup(),
        utils.display_no_save_popup(),
        settings.init_less_sync(),
    ]).then(_ => {
        return main_page_data;
    });
}