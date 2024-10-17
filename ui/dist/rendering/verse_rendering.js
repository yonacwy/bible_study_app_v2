import * as utils from "../utils.js";
import * as rendering from "./bible_rendering.js";
import * as bible from "../bible.js";
import * as highlighting from "../highlights.js";
import * as wp from "../word_popup.js";
import * as sp from "../side_popup.js";
import { ERASER_STATE_NAME } from "../save_states.js";
const HIGHLIGHT_CATAGORIES = await highlighting.get_catagories();
/**
 * Note: this function must be called only once on page reload
 */
export function init_highlighting(side_popup, on_require_rerender) {
    document.addEventListener('mouseup', _e => on_stop_dragging(side_popup, on_require_rerender));
}
export async function render_verse(args) {
    let elements = [];
    let verse_data = await utils.invoke('get_verse', { book: args.chapter.book, chapter: args.chapter.number, verse: args.verse });
    let words = verse_data.words;
    let offset = await bible.get_verse_word_offset(args.chapter.book, args.chapter.number, args.verse);
    let chapter_annotations = JSON.parse(await utils.invoke('get_chapter_annotations', { chapter: args.chapter }));
    let last_word_annotations = null;
    for (let i = 0; i < words.length; i++) {
        let word_annotations = chapter_annotations[offset + i];
        if (i != 0) {
            let space = rendering.create_bible_space();
            if (word_annotations !== undefined && word_annotations !== null && last_word_annotations !== null) {
                if (word_annotations.highlights.length !== 0 && last_word_annotations.highlights.length !== null) {
                    let overlap = utils.overlap(word_annotations.highlights, last_word_annotations.highlights);
                    if (overlap.length !== 0) {
                        let space_highlight = rendering.get_highest_priority_highlight(overlap, HIGHLIGHT_CATAGORIES);
                        let space_color = HIGHLIGHT_CATAGORIES[space_highlight].color;
                        space = rendering.color(space, space_color);
                    }
                }
                if (word_annotations.notes.length !== null && last_word_annotations.notes.length !== 0) {
                    space.style.textDecoration = 'underline';
                }
            }
            elements.push(space);
        }
        let color = null;
        if (word_annotations !== null && word_annotations !== undefined) {
            if (word_annotations.highlights.length !== 0) {
                let id = rendering.get_highest_priority_highlight(word_annotations.highlights, HIGHLIGHT_CATAGORIES);
                color = HIGHLIGHT_CATAGORIES[id].color;
            }
            last_word_annotations = word_annotations;
        }
        else {
            last_word_annotations = null;
        }
        let has_notes = false;
        if (word_annotations !== null && word_annotations !== undefined && word_annotations.notes.length !== 0) {
            has_notes = true;
        }
        let word_node = rendering.render_word(words[i], args.bolded, color, has_notes);
        if (word_annotations !== null && word_annotations !== undefined && (word_annotations.highlights.length !== 0 || word_annotations.notes.length !== 0)) {
            wp.display_on_div(word_node, word_annotations.highlights.map((h) => HIGHLIGHT_CATAGORIES[h].color), has_notes, args.word_popup);
            let word = utils.trim_string(words[i].text);
            sp.display_on_div(word_node, word, word_annotations, args.side_popup, args.side_popup_content, args.on_search);
        }
        word_node.addEventListener('mousedown', e => {
            on_start_dragging(args.chapter, offset + i, word_node);
        });
        word_node.addEventListener('mouseover', e => {
            on_over_dragging(args.chapter, offset + i, word_node);
        });
        elements.push(word_node);
    }
    return elements;
}
let is_dragging = false;
function on_start_dragging(chapter, word_index, word_div) {
    if (highlighting.get_selected_highlight() !== null) {
        is_dragging = true;
        update_word(chapter, word_index, word_div);
    }
}
function on_over_dragging(chapter, word_index, word_div) {
    if (is_dragging && highlighting.get_selected_highlight() !== null) {
        update_word(chapter, word_index, word_div);
    }
}
function on_stop_dragging(word_popup, on_require_rerender) {
    if (is_dragging && highlighting.get_selected_highlight() !== null) {
        is_dragging = false;
        word_popup.classList.remove('show');
        let scroll = window.scrollY;
        on_require_rerender().then(() => {
            window.scrollTo(window.scrollX, scroll);
        });
    }
}
function update_word(chapter, word, div) {
    div.style.color = rendering.HIGHLIGHT_SELECTED_WORD_COLOR;
    let selected_highlight = highlighting.get_selected_highlight();
    if (selected_highlight === null)
        return;
    if (utils.get_toggle_value(ERASER_STATE_NAME) !== true) {
        highlighting.highlight_word(chapter, word, selected_highlight);
    }
    else {
        highlighting.erase_highlight(chapter, word, selected_highlight);
    }
}
