import * as utils from "../utils.js";
import * as pages from "./pages.js";
import * as view_states from "../view_states.js";
import { SearchSection } from "../bindings.js";
import * as search from "../rendering/word_search.js";
import { ERASER_STATE_NAME } from "../save_states.js";
import * as side_popup from "../side_popup.js";

export function run()
{
    let section = utils.decode_from_url(window.location.href) as SearchSection;
    utils.init_format_copy_event_listener();

    Promise.all([
        pages.init_nav_buttons(),
        pages.init_chapter_selection_dropdown(),
        pages.init_highlight_editor_button(),
        pages.init_highlight_selection(null),
        pages.update_nav_buttons_opacity(),
        pages.init_search_bar(),
        utils.init_toggle('erase-highlight-toggle', ERASER_STATE_NAME, _ => {}),
        side_popup.init_popup_panel('popup-panel'),
        
        display_search(section)
    ]).then(() => {
        document.body.style.visibility = 'visible';
    })
}

async function display_search(section: SearchSection): Promise<void>
{
    const word_popup = document.getElementById('word-popup');
    const side_popup = document.getElementById('popup-panel');
    const side_popup_content = document.getElementById('popup-panel-content');
    
    if(word_popup === null || side_popup === null || side_popup_content === null) return;
    
    let search_result = await utils.invoke('run_word_search', { words: section.words });
    
    utils.set_value('search-input', section.words.join(" "));

    search.render_search_result(search_result, section.words, 'word-search-content', word_popup, side_popup, side_popup_content, section.display_index, 
        () => {
            pages.update_nav_buttons_opacity();
            pages.update_word_selection();
        }, 
        (msg: string) => {
            utils.set_value('search-input', msg);
            document.getElementById('search-btn')?.click();
        }
    );
}