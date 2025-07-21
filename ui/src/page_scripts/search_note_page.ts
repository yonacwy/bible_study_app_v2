import { ReferenceLocation, SearchSection } from "../bindings.js";
import * as utils from "../utils/index.js";
import * as pages from "./pages.js";
import * as search_page from "./search_page.js";
import { init_note_page } from "./note_pages.js";
import * as view_states from "../view_states.js";

export type SearchNotePageData = { note: string, section: SearchSection };

export async function run()
{
    let data = utils.decode_from_url(window.location.href) as SearchNotePageData;
    utils.init_format_copy_event_listener();

    await pages.invoke_shared_main_page_initializers(() => view_states.goto_current_view_state()); // need to init this before the header data
    let header_data = await pages.init_header();

    Promise.all([
        search_page.display_search(data.section, header_data),
        init_note_page(data.note, () => {
            utils.conserve_scroll(() => {
                return search_page.display_search(data.section, header_data);
            }, 'left-pane')
        }, header_data.on_search),
    ]).then(() => {
        document.body.style.visibility = 'visible';
    });
}