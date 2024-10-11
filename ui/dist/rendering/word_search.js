import * as utils from "../utils.js";
import * as bible from "../bible.js";
import { push_search } from "../view_states.js";
import * as verse_renderer from "./verse_rendering.js";
const MAX_DISPLAY = 50;
let was_initialized = false;
/**
 * Initializes the rendering of a search result.
 * When display index is set, will automatically rerender the page
 * @param on_rendered -- Will be called when the display index changes
 * @param on_search -- Called when a search for a verse is called
 */
export async function render_search_result(result, searched, results_id, word_popup, side_popup, side_popup_content, display_index, on_rendered, on_search) {
    if (!was_initialized) {
        was_initialized = true;
        let on_require_rerender = () => render_search_result(result, searched, results_id, word_popup, side_popup, side_popup_content, display_index, on_rendered, on_search);
        verse_renderer.init_highlighting(side_popup, on_require_rerender);
    }
    const results_node = document.getElementById(results_id);
    if (results_node === null)
        return;
    let result_count = result.length;
    let new_children = [];
    append_search_header(result_count, new_children, searched);
    let start = display_index * MAX_DISPLAY;
    let end = Math.min(result_count, MAX_DISPLAY + start);
    for (let i = start; i < end; i++) {
        let result_data = result[i];
        let verse_node = await spawn_verse(result_data, searched, word_popup, side_popup, side_popup_content);
        let reference_node = await spawn_reference(result_data.book, result_data.chapter, result_data.verse, on_search);
        let result_node = document.createElement('div');
        result_node.classList.add('verse');
        result_node.appendChild(verse_node);
        result_node.appendChild(reference_node);
        new_children.push(result_node);
    }
    let render_section = (i) => render_search_result(result, searched, results_id, word_popup, side_popup, side_popup_content, i, on_rendered, on_search);
    let buttons = await generate_section_buttons(result, render_section, display_index, searched);
    if (buttons !== null) {
        new_children.push(buttons);
    }
    results_node.replaceChildren(...new_children);
    on_rendered();
}
function append_search_header(result_count, new_children, searched) {
    if (result_count === 0) {
        let results_title = document.createElement('h2');
        results_title.innerHTML = `No results found`;
        new_children.push(results_title);
    }
    else if (result_count === 1) {
        let results_title = document.createElement('h2');
        results_title.innerHTML = `Found a result for "${searched.join(' ')}"`;
        new_children.push(results_title);
    }
    else {
        let results_title = document.createElement('h2');
        results_title.innerHTML = `Found ${result_count} results for "${searched.join(' ')}"`;
        new_children.push(results_title);
    }
}
async function generate_section_buttons(search_results, render_section, display_index, searched) {
    let view = await bible.load_view();
    let section_count = Math.ceil(search_results.length / MAX_DISPLAY);
    if (section_count <= 1) {
        return null;
    }
    let parent = document.createElement('div');
    parent.classList.add('selection-buttons');
    for (let i = 0; i < section_count; i++) {
        let start_index = i * MAX_DISPLAY;
        let start_result = search_results[start_index];
        let start_text = `${bible.shorten_book_name(view[start_result.book].name)} ${start_result.chapter + 1}:${start_result.verse + 1}`;
        let end_index = Math.min(search_results.length - 1, MAX_DISPLAY + start_index - 1);
        let end_result = search_results[end_index];
        let end_text = `${bible.shorten_book_name(view[end_result.book].name)} ${end_result.chapter + 1}:${end_result.verse + 1}`;
        let name = `${start_text} - ${end_text}`;
        let button = document.createElement('button');
        button.innerHTML = name;
        button.addEventListener('click', e => {
            push_search(searched, i);
            render_section(i);
        });
        if (display_index === i) {
            button.classList.add('selected-button');
        }
        parent.appendChild(button);
    }
    return parent;
}
async function spawn_verse(position, searched, word_popup, side_popup, side_popup_content) {
    searched = searched.map(s => s.toLocaleLowerCase());
    let verse_node = document.createElement('p');
    let elements = await verse_renderer.render_verse({
        chapter: { book: position.book, number: position.chapter },
        verse: position.verse,
        word_popup: word_popup,
        side_popup: side_popup,
        side_popup_content: side_popup_content,
        bolded: searched,
    });
    verse_node.append(...elements);
    return verse_node;
}
async function spawn_reference(book, chapter, verse, on_search) {
    let book_title = await utils.invoke('get_book_name', { book: book });
    let verse_reference_text = `${book_title} ${chapter + 1}:${verse + 1}`;
    let reference = document.createElement('div');
    reference.classList.add('reference');
    reference.innerHTML = verse_reference_text;
    reference.title = `Go to ${verse_reference_text}`;
    reference.addEventListener('click', e => {
        on_search(verse_reference_text);
    });
    return reference;
}
