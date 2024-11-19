import { BibleSection, ChapterIndex } from "../bindings.js";
import * as utils from "../utils/index.js";
import * as pages from "./pages.js";
import * as bible_page from "./bible_page.js";
import { init_note_page } from "./note_pages.js";

export type BibleNotePageData = { note: string, section: BibleSection };

export function run()
{
    let data = utils.decode_from_url(window.location.href) as BibleNotePageData;
    utils.init_format_copy_event_listener();

    let chapter: ChapterIndex = {
        book: data.section.book,
        number: data.section.chapter
    };

    Promise.all([
        pages.init_header(),
        init_note_page(data.note, () => {
            utils.conserve_scroll(() => {
                return bible_page.display_chapter(chapter, data.section.verse_range);
            }, 'left-pane')
        }),
        bible_page.display_chapter(chapter, data.section.verse_range),
        bible_page.init_chapter_buttons(),
        
        pages.init_context_menu(),
    ]).then(_ => {
        document.body.style.visibility = 'visible';
    });
}