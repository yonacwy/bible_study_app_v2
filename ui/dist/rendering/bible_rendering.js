import * as utils from "../utils.js";
export const HIGHLIGHT_SELECTED_WORD_COLOR = 'blueviolet';
export function render_word(word, searched, c, has_note) {
    let word_node = create_bible_word(word.text);
    if (has_note) {
        word_node.style.textDecoration = 'underline';
    }
    if (word.italicized) {
        word_node.style.fontStyle = 'italic';
    }
    if (searched !== null && searched.includes(utils.trim_string(word.text).toLocaleLowerCase())) {
        word_node = bold(word_node);
    }
    if (c !== null) {
        word_node = color(word_node, c);
    }
    return word_node;
}
export function get_highest_priority_highlight(word_highlights, catagories) {
    let max_highlight = word_highlights[0];
    for (let i = 1; i < word_highlights.length; i++) {
        let priority = catagories[word_highlights[i]].priority;
        let max_priority = catagories[max_highlight].priority;
        if (priority > max_priority) {
            max_highlight = word_highlights[i];
        }
    }
    return max_highlight;
}
export function create_bible_space() {
    let space = document.createElement('div');
    space.innerHTML = "&nbsp;";
    space.classList.add('bible-space');
    return space;
}
export function create_bible_word(t) {
    let word = document.createElement('div');
    word.innerHTML = t;
    word.classList.add('bible-word');
    return word;
}
export function underline(t) {
    let u = document.createElement('u');
    u.appendChild(t);
    return u;
}
export function italicize(t) {
    let i = document.createElement('i');
    i.appendChild(t);
    return i;
}
export function bold(t) {
    let b = document.createElement('strong');
    b.appendChild(t);
    return b;
}
export function color(t, c) {
    let span = document.createElement('span');
    span.appendChild(t);
    span.style.backgroundColor = utils.color_to_hex(c);
    return span;
}
