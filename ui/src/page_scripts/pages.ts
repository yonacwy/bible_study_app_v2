import * as highlight_utils from "../highlights.js";
import * as utils from "../utils/index.js";
import * as view_states from "../view_states.js";
import { build_chapter_selection_dropdown } from "../chapter_selector.js";
import { show_error_popup } from "../popups/error_popup.js";
import * as side_popup from "../popups/side_popup.js";
import { init_word_popup } from "../popups/word_popup.js";
import * as context_menu from "../popups/context_menu.js";
import { ContextMenuCommand } from "../popups/context_menu.js";
import { HighlightCategory } from "../bindings.js";
import { init_main_page_header } from "./menu_header.js";
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

export async function init_header(extra?: (e: HTMLElement) => void): Promise<void>
{
    init_main_page_header(extra);

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

    await Promise.all([
        init_nav_buttons(),
        init_chapter_selection_dropdown(),
        update_nav_buttons_opacity(),
        init_search_bar(),
        side_popup.init_popup_panel('popup-panel'),
        utils.display_migration_popup(),
        utils.display_no_save_popup(),
        settings.init_less_sync(),
        init_bible_version_dropdown(),
    ]).then(_ => {
        init_settings_buttons(window.location.href);
    });
}


const DEFAULT_BUTTON_COLOR: string = document.getElementById(HIGHLIGHT_SELECTOR_ID)?.style.backgroundColor ?? "white";

export function init_nav_buttons()
{
    utils.on_click(FORWARD_BUTTON_ID, e => {
        if(utils.contains_class(FORWARD_BUTTON_ID, 'inactive')) return;

        view_states.next_view_state().then(() => {
            view_states.goto_current_view_state();
        })
    });

    utils.on_click(BACK_BUTTON_ID, e => {
        if(utils.contains_class(BACK_BUTTON_ID, 'inactive')) return;

        view_states.previous_view_state().then(() => {
            view_states.goto_current_view_state();
        })
    });
}

export function init_settings_buttons(old_path: string)
{
    utils.on_click('help-btn', _ => window.location.href = utils.encode_to_url('help_page.html', { old_path: old_path }));
    utils.on_click('highlight-settings', _ => window.location.href = utils.encode_to_url('highlight_editor.html', { old_path: old_path }));
    utils.on_click('main-settings', _ => window.location.href = utils.encode_to_url('settings_page.html', { old_path: old_path }));
    utils.on_click('readings-btn', _ => window.location.href = utils.encode_to_url('daily_readings_page.html', { old_path: old_path }));
}

export function update_nav_buttons_opacity() 
{
    view_states.is_last_view_state().then(is_last => {
        if(is_last)
        {
            utils.add_class('forward-btn', 'inactive');
        }
        else 
        {
            utils.remove_class('forward-btn', 'inactive');
        }
    });

    view_states.is_first_view_state().then(is_first => {
        if(is_first)
        {
            utils.add_class('back-btn', 'inactive');
        }
        else 
        {
            utils.remove_class('back-btn', 'inactive');
        }
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

export async function init_bible_version_dropdown(on_version_changed?: () => void)
{
    let dropdown = document.getElementById('bible-version-dropdown');
    let title = dropdown?.getElementsByClassName('dropdown-title')[0];
    let content = dropdown?.getElementsByClassName('dropdown-content')[0];

    if (!dropdown || !title || !content) return;

    let selected_version = await bible.get_current_bible_version();
    let versions = await bible.get_bible_versions();

    title.innerHTML = selected_version;

    content.replaceChildren();
    versions.sort().forEach(v => {
        content.append_element_ex('div', ['dropdown-option'], option => {
            if (v === selected_version) 
            {
                option.classList.add('selected-option');
            }

            option.innerHTML = v;

            option.addEventListener('click', e => {
                bible.set_bible_version(v);
            })
        })
    })
}

export function init_back_button(old_path: string)
{
    document.getElementById(BACK_BUTTON_ID)?.addEventListener('click', e => {
        window.location.href = old_path;
    });
}

export function on_require_search(msg: string)
{
    utils.set_value('search-input', msg);
    document.getElementById('search-btn')?.click();
}