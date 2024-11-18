import { ChapterIndex } from "./bindings";
import * as highlighting from "./highlights.js";
import { HIGHLIGHT_SELECTED_WORD_COLOR } from "./rendering/bible_rendering.js";
import * as utils from "./utils/index.js"

export function init_word_selection(side_popup: HTMLElement | null, on_require_rerender: () => Promise<void>): void
{
    document.addEventListener('mouseup', _e => on_stop_dragging(side_popup, on_require_rerender));
}

export enum WordSelectType
{
    Note,
    Highlight,
}

type WordRange = {
    words: Element[],
    chapter: ChapterIndex,
    word_offset: number,
}

type WordData = {
    word: Element,
    chapter: ChapterIndex,
    word_offset: number,
}

let ranges: WordRange[] = [];

export function clear_selection_ranges()
{
    ranges = [];
}

export function push_selection_range(content: HTMLElement, chapter: ChapterIndex, word_offset: number)
{
    let word_nodes = content.getElementsByClassName('bible-word');

    for(let i = 0; i < word_nodes.length; i++)
    {
        let word_node = word_nodes[i] as HTMLElement;
        word_node.addEventListener('mousedown', e => {
            if(e.button !== utils.LEFT_MOUSE_BUTTON) return;
            on_start_dragging(chapter, word_offset + i, word_node);
        });

        word_node.addEventListener('mouseover', e => {
            if(e.button !== utils.LEFT_MOUSE_BUTTON) return;
            on_over_dragging(chapter, word_offset + i, word_node);
        });
    }

    ranges.push({
        words: [...word_nodes],
        chapter: chapter,
        word_offset: word_offset,
    });
}

let is_dragging = false;
function on_start_dragging(chapter: ChapterIndex, word_index: number, word_div: HTMLElement) 
{
    if(highlighting.SELECTED_HIGHLIGHT.get() !== null)
    {
        is_dragging = true;
        update_word(chapter, word_index, word_div);
    }
}

function on_over_dragging(chapter: ChapterIndex, word_index: number, word_div: HTMLElement) 
{
    if(is_dragging && highlighting.SELECTED_HIGHLIGHT.get() !== null)
    {
        update_word(chapter, word_index, word_div);
    }
}

function on_stop_dragging(word_popup: HTMLElement | null, on_require_rerender: () => Promise<void>) 
{
    if(is_dragging && highlighting.SELECTED_HIGHLIGHT.get() !== null)
    {
        is_dragging = false;
        word_popup?.classList.remove('show');

        let scroll = window.scrollY;

        on_require_rerender().then(() => {
            window.scrollTo(window.scrollX, scroll);
        });
    }
}

function update_word(chapter: ChapterIndex, word: number, div: HTMLElement)
{
    div.style.color = HIGHLIGHT_SELECTED_WORD_COLOR;
    let selected_highlight = highlighting.SELECTED_HIGHLIGHT.get();

    if(selected_highlight === null) return;
    if(highlighting.ERASING_HIGHLIGHT.get() !== true)
    {
        highlighting.highlight_word(chapter, word, selected_highlight);
    }
    else 
    {
        highlighting.erase_highlight(chapter, word, selected_highlight);
    }
}