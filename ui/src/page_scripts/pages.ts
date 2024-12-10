import * as highlight_utils from "../highlights.js";
import * as utils from "../utils/index.js";
import * as view_states from "../view_states.js";
import *  as bible from "../bible.js";
import { build_chapter_selection_dropdown } from "../selection.js";
import { show_error_popup } from "../popups/error_popup.js";
import * as side_popup from "../popups/side_popup.js";
import { init_word_popup } from "../popups/word_popup.js";
import * as context_menu from "../popups/context_menu.js";
import { ContextMenuCommand } from "../popups/context_menu.js";
import { HighlightCategory } from "../bindings.js";
import * as word_select from "../word_select.js";

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

export async function init_header(): Promise<void>
{
    highlight_utils.SELECTED_HIGHLIGHT.add_listener(on_highlight_changed);
    word_select.add_note_listener({
        on_start: () => utils.debug_print('starting selecting note'),
        on_end: () => utils.debug_print('ending selecting note'),
    });

    let word_popup = document.getElementById(WORD_POPUP_ID);
    if(word_popup !== null)
    {
        init_word_popup(word_popup);
    }

    await Promise.all([
        init_nav_buttons(),
        init_chapter_selection_dropdown(),
        init_highlight_editor_button(),
        highlight_utils.create_highlight_selection(),
        update_nav_buttons_opacity(),
        init_search_bar(),
        utils.init_toggle('erase-highlight-toggle', highlight_utils.ERASING_HIGHLIGHT),
        side_popup.init_popup_panel('popup-panel'),
        utils.display_migration_popup(),
    ]);
}

export function init_nav_buttons()
{
    utils.on_click(FORWARD_BUTTON_ID, e => {
        view_states.next_view_state().then(() => {
            view_states.goto_current_view_state();
        })
    });

    utils.on_click(BACK_BUTTON_ID, e => {
        view_states.previous_view_state().then(() => {
            view_states.goto_current_view_state();
        })
    });
}

export function update_nav_buttons_opacity() 
{
    const INACTIVE_OPACITY = 0.3;
    view_states.is_last_view_state().then(is_last => {
        if(is_last)
        {
            utils.set_opacity('forward-btn', INACTIVE_OPACITY.toString());
        }
        else 
        {
            utils.set_opacity('forward-btn', 1.0.toString());
        }
    });

    view_states.is_first_view_state().then(is_first => {
        if(is_first)
        {
            utils.set_opacity('back-btn', INACTIVE_OPACITY.toString());
        }
        else 
        {
            utils.set_opacity('back-btn', 1.0.toString());
        }
    });
}

const DEFAULT_BUTTON_COLOR: string = document.getElementById(HIGHLIGHT_SELECTOR_ID)?.style.backgroundColor ?? "white";
const DISABLED_OPACITY: number = 0.3;

export function on_highlight_changed(id: string | null)
{
    word_select.update_words_for_selection();
    highlight_utils.get_categories().then(categories => {
        let color = DEFAULT_BUTTON_COLOR;
        let opacity = DISABLED_OPACITY;
        if(id !== null)
        {
            let category = categories[id];
            color = utils.color_to_hex(category.color);
            opacity = 1.0;
        }

        let btn = document.getElementById('highlight-selector-btn');
        if (btn !== null) 
        {
            btn.style.backgroundColor = color;
            btn.style.opacity = opacity.toString();
        }
    });

    highlight_utils.update_highlight_selection();
}

export function init_highlight_editor_button()
{
    document.getElementById(HIGHLIGHT_EDITOR_BUTTON_ID)?.addEventListener('click', e => {
        window.location.href = utils.encode_to_url('highlight_editor.html', {
            old_path: window.location.href
        });
    });
}

export function init_search_bar()
{
    utils.on_click(SEARCH_BUTTON_ID, e => {
        let value = utils.read_value(SEARCH_INPUT_ID);
        utils.invoke('parse_bible_search', { text: value }).then(result => {
            if(result.type !== 'error') { utils.reset_scroll() }

            if(result.type === 'error')
            {
                show_error_popup('error-message', true, result.error);
            }
            else if(result.type === 'word')
            {
                view_states.push_search(result.words, 0).then(() => {
                    view_states.goto_current_view_state();
                });
            }
            else if (result.type === 'section')
            {
                view_states.push_section(result.section).then(() => {
                    view_states.goto_current_view_state();
                });
            }
            else 
            {
                show_error_popup('error-message', true, `Search type ${result.type} unsupported on the front end`)
            }
        })
    });

    document.getElementById(SEARCH_INPUT_ID)?.addEventListener('keydown', e => {
        if(e.key === 'Enter')
        {
            document.getElementById(SEARCH_BUTTON_ID)?.click();
        }
    });
}

export async function init_chapter_selection_dropdown()
{
    build_chapter_selection_dropdown(CHAPTER_SELECTOR_ID, (name, number) => {
        utils.set_value(SEARCH_INPUT_ID, `${name} ${number}`);
        document.getElementById(SEARCH_BUTTON_ID)?.click();
    });
}

export async function init_context_menu(target_id: string)
{
    let categories = Object.values(await highlight_utils.get_categories() as object) as HighlightCategory[];
    let highlight_selections: ContextMenuCommand[] = categories.map(v => {
        let selection: ContextMenuCommand = {
            name: v.name,
            command: async () => { 
                highlight_utils.SELECTED_HIGHLIGHT.set(v.id); 
                highlight_utils.ERASING_HIGHLIGHT.set(false);
            }
        }

        return selection;
    });

    let erase_selections: ContextMenuCommand[] = categories.map(v => {
        let selection: ContextMenuCommand = {
            name: v.name,
            command: async () => { 
                highlight_utils.SELECTED_HIGHLIGHT.set(v.id); 
                highlight_utils.ERASING_HIGHLIGHT.set(true);
            }
        }

        return selection;
    });

    let should_interrupt = async () => {
        if(word_select.is_selecting())
        {
            word_select.stop_selecting();
            return true;
        }

        return false;
    }

    context_menu.init_context_menu(target_id, [
        {
            name: 'New Note',
            command: async () => { word_select.begin_making_note() }
        },
        {
            name: 'Highlight',
            args: highlight_selections
        },
        {
            name: 'Erase',
            args: erase_selections
        }
    ], should_interrupt)
}