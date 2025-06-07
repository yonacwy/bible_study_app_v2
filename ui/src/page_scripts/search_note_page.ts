import { SearchSection } from "../bindings.js";
import * as utils from "../utils/index.js";
import * as pages from "./pages.js";
import * as search_page from "./search_page.js";
import { init_note_page, scroll_to_editing } from "./note_pages.js";

export type SearchNotePageData = { note: string, section: SearchSection };

export async function run()
{
    let data = utils.decode_from_url(window.location.href) as SearchNotePageData;
    utils.init_format_copy_event_listener();

    let header_data = await pages.init_header()

    Promise.all([
        search_page.display_search(data.section, header_data.update_nav_active),
        init_note_page(data.note, () => {
            utils.conserve_scroll(() => {
                return search_page.display_search(data.section, header_data.update_nav_active);
            }, 'left-pane')
        }, header_data.on_search),
    ]).then(() => {
        scroll_to_editing();
        document.body.style.visibility = 'visible';
    })
}