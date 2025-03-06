import { SearchSection } from "../bindings.js";
import * as utils from "../utils/index.js";
import * as pages from "./pages.js";
import * as search_page from "./search_page.js";
import { init_note_page, scroll_to_editing } from "./note_pages.js";

export type SearchNotePageData = { note: string, section: SearchSection };

export function run()
{
    let data = utils.decode_from_url(window.location.href) as SearchNotePageData;
    utils.init_format_copy_event_listener();

    Promise.all([
        pages.init_header(),
        search_page.display_search(data.section),
        init_note_page(data.note, () => {
            utils.conserve_scroll(() => {
                return search_page.display_search(data.section);
            }, 'left-pane')
        }),
    ]).then(() => {
        scroll_to_editing();
        document.body.style.visibility = 'visible';
    })
}