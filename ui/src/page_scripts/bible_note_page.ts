import { BibleSection, ChapterIndex } from "../bindings.js";
import * as utils from "../utils/index.js";
import * as pages from "./pages.js";
import * as bible_page from "./bible_page.js";
import { init_note_page, scroll_to_editing } from "./note_pages.js";
import * as audio_player from "../popups/audio_player.js";
import { TextEditor } from "../text_editor/index.js";

export type BibleNotePageData = { note: string, section: BibleSection };

export function run()
{
    let data = utils.decode_from_url(window.location.href) as BibleNotePageData;
    utils.init_format_copy_event_listener();

    let chapter: ChapterIndex = {
        book: data.section.book,
        number: data.section.chapter
    };

    audio_player.init_player();

    Promise.all([
        pages.init_header(e => {
            let last = e.children[e.children.length - 1];
            let button = bible_page.spawn_audio_player_button();
            e.insertBefore(button, last);
        }),
        init_note_page(data.note, () => {
            utils.conserve_scroll(() => {
                return bible_page.display_chapter(chapter, data.section.verse_range);
            }, 'left-pane')
        }, pages.on_require_search),
        bible_page.display_chapter(chapter, data.section.verse_range),
        bible_page.init_chapter_buttons(),
    ]).then(_ => {
        scroll_to_editing();
        document.body.style.visibility = 'visible';
    });
}