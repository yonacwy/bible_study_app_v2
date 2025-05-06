import { Color, Word } from "../bindings.js";
import * as utils from "../utils/index.js";

export const HIGHLIGHT_SELECTED_WORD_COLOR = 'blueviolet';

export type WordData = {
    word: Word,
    has_note: boolean,
    searched: string[] | null,
    color: Color | null,
}

export function render_word(data: WordData)
{
    let word_node: HTMLElement = create_bible_word(data.word.text);

    if(data.has_note)
    {
        word_node.style.textDecoration = 'underline';
        word_node.style.cursor = 'pointer';
    }

    if (data.word.italicized)
    {
        word_node.style.fontStyle = 'italic';
    }
    
    if (data.searched !== null && data.searched.includes(utils.trim_string(data.word.text).toLocaleLowerCase()))
    {
        word_node = bold(word_node);
    }

    if(data.color !== null)
    {
        word_node = color(word_node, data.color);
    }

    return word_node
}

export function get_highest_priority_highlight(word_highlights: string[], categories: any): string
{
    let max_highlight = word_highlights[0];
    for(let i = 1; i < word_highlights.length; i++)
    {
        let priority = categories[word_highlights[i]].priority;
        let max_priority = categories[max_highlight].priority

        if(priority > max_priority)
        {
            max_highlight = word_highlights[i];
        } 
    }

    return max_highlight;
}

export function create_bible_space(): HTMLElement
{
    let space = document.createElement('span');
    space.innerHTML = "&nbsp;"
    space.classList.add('bible-space');
    return space;
}

export function create_bible_word(t: string): HTMLElement
{
    let word = document.createElement('span');
    word.innerHTML = t;
    word.classList.add('bible-word');
    return word;
}

export function bold(t: HTMLElement): HTMLElement
{
    let b = document.createElement('strong');
    b.appendChild(t);
    return b;
}

export function color(t: HTMLElement, c: Color): HTMLElement
{
    let span = document.createElement('span');
    span.appendChild(t);
    span.style.backgroundColor = utils.color_to_hex(c);
    return span;
}