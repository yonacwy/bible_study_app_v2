import { ReferenceLocation, SearchSection } from "../bindings.js";
import * as utils from "../utils/index.js";
import * as pages from "./pages.js";
import * as search_page from "./search_page.js";
import { init_note_page } from "./note_pages.js";

export type SearchNotePageData = { note: string, section: SearchSection };

export async function run()
{
    let data = utils.decode_from_url(window.location.href) as SearchNotePageData;
    utils.init_format_copy_event_listener();

    let header_data = await pages.init_header()

    Promise.all([
        search_page.display_search(data.section, header_data),
        init_note_page(data.note, () => {
            utils.conserve_scroll(() => {
                return search_page.display_search(data.section, header_data);
            }, 'left-pane')
        }, header_data.on_search),
        pages.invoke_shared_main_page_initializers(),
    ]).then(() => {
        document.body.style.visibility = 'visible';
    });
}