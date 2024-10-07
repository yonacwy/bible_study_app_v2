import * as highlight_utils from "../highlights.js";
import * as utils from "../utils.js";
import * as view_states from "../view_states.js";
import * as bible from "../bible.js";
import { build_chapter_selection_dropdown } from "../selection.js";
export const SEARCH_INPUT_ID = "search-input";
export const SEARCH_BUTTON_ID = "search-btn";
export const BACK_BUTTON_ID = "back-btn";
export const FORWARD_BUTTON_ID = "forward-btn";
export const POPUP_PANEL_ID = "popup-panel";
export const POPUP_PANEL_CONTENT_ID = "popup-panel-content";
export const WORD_POPUP_ID = "word-popup";
export const HIGHLIGHT_SELECTOR_ID = "highlight-selector-btn";
export const HIGHLIGHT_EDITOR_BUTTON_ID = "highlight-settings";
const CHAPTER_SELECTOR_ID = "book-selection-content";
export function init_nav_buttons() {
    utils.on_click(FORWARD_BUTTON_ID, e => {
        view_states.next_view_state().then(() => {
            utils.debug_print('going to next view state');
        });
    });
    utils.on_click(BACK_BUTTON_ID, e => {
        view_states.previous_view_state().then(() => {
            utils.debug_print('going to previous view state');
        });
    });
}
export function update_nav_buttons_opacity() {
    const INACTIVE_OPACITY = 0.3;
    view_states.is_last_view_state().then(is_last => {
        if (is_last) {
            utils.set_opacity('forward-btn', INACTIVE_OPACITY.toString());
        }
        else {
            utils.set_opacity('forward-btn', 1.0.toString());
        }
    });
    view_states.is_first_view_state().then(is_first => {
        if (is_first) {
            utils.set_opacity('back-btn', INACTIVE_OPACITY.toString());
        }
        else {
            utils.set_opacity('back-btn', 1.0.toString());
        }
    });
}
export function update_word_selection() {
    if (highlight_utils.get_selected_highlight() !== null) {
        document.querySelectorAll('.bible-word, .bible-space').forEach(w => {
            w.style.userSelect = 'none';
            w.style.cursor = 'pointer';
        });
    }
    else {
        document.querySelectorAll('.bible-word, .bible-space').forEach(w => {
            w.style.userSelect = 'text';
            w.style.cursor = 'default';
        });
    }
}
export function init_highlight_selection(on_change) {
    const DEFAULT_BUTTON_COLOR = document.getElementById(HIGHLIGHT_SELECTOR_ID)?.style.backgroundColor ?? "white";
    bible.create_highlight_selection(id => {
        highlight_utils.get_catagories().then(catagories => {
            let color = DEFAULT_BUTTON_COLOR;
            let opacity = 0.3;
            if (id !== null) {
                let category = catagories[id];
                color = utils.color_to_hex(category.color);
                opacity = 1.0;
            }
            highlight_utils.set_selected_highlight(id);
            let btn = document.getElementById('highlight-selector-btn');
            if (btn !== null) {
                btn.style.backgroundColor = color;
                btn.style.opacity = opacity.toString();
                update_word_selection();
            }
            if (on_change !== null) {
                on_change(id);
            }
        });
    });
}
export function init_search_enter() {
    document.getElementById(SEARCH_INPUT_ID)?.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            document.getElementById(SEARCH_BUTTON_ID)?.click();
        }
    });
}
export function init_highlight_editor_button() {
    document.getElementById(HIGHLIGHT_EDITOR_BUTTON_ID)?.addEventListener('click', e => {
        window.location.href = utils.encode_to_url('highlight_editor.html', {
            old_path: window.location.href
        });
    });
}
export async function init_chapter_selection_dropdown() {
    build_chapter_selection_dropdown(CHAPTER_SELECTOR_ID, (name, number) => {
        utils.set_value(SEARCH_INPUT_ID, `${name} ${number}`);
        document.getElementById(SEARCH_BUTTON_ID)?.click();
    });
}
