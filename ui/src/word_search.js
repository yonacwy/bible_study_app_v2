import * as utils from "./utils.js";
import * as render from "./bible_render.js"
import * as bible from "./bible.js";
import * as wp from "./word_popup.js";
import * as sp from "./side_popup.js"
import { erase_highlight, get_catagories, get_selected_highlight, highlight_word } from "./highlights.js";
import { ERASER_STATE_NAME } from "./save_states.js";

let old_event_handler = null;
const MAX_DISPLAY = 50;

export async function render_search_result(result, searched, results_id, word_popup, side_popup, side_popup_content, display_index, on_rendered, on_search)
{
    const catagories = await get_catagories();
    const results_node = document.getElementById(results_id);

    let result_count = result.length;
    let new_children = [];

    append_search_header(result_count, new_children, searched);

    let event_handler = _e => on_stop_dragging(result, searched, results_id, word_popup, side_popup, side_popup_content, display_index, on_rendered, on_search)
    if(old_event_handler !== null)
    {
        document.removeEventListener('mouseup', old_event_handler);
    }
    document.addEventListener('mouseup', event_handler);
    old_event_handler = event_handler;

    let render_section = (i) => render_search_result(result, searched, results_id, word_popup, side_popup, side_popup_content, i, on_rendered, on_search);

    append_section_buttons(result, render_section, display_index, new_children);

    let start = display_index * MAX_DISPLAY;
    let end = Math.min(result_count, MAX_DISPLAY + start);

    for(let i = start; i < end; i++)
    {
        let result_data = result[i];
        let verse_data = await utils.invoke('get_verse', { book: result_data.book, chapter: result_data.chapter, verse: result_data.verse });
        
        let verse_node = await spawn_verse(verse_data.words, searched, result_data, catagories, word_popup, side_popup, side_popup_content);
        let reference_node = await spawn_reference(result_data.book, result_data.chapter, result_data.verse, on_search);

        let result_node = document.createElement('div');
        result_node.classList.add('verse');
        result_node.appendChild(verse_node);
        result_node.appendChild(reference_node);
        new_children.push(result_node);
    }

    results_node.replaceChildren(...new_children);
    on_rendered();
}

function append_search_header(result_count, new_children, searched) 
{
    if (result_count === 0) 
    {
        let results_title = document.createElement('h2');
        results_title.innerHTML = `No results found`;
        new_children.push(results_title);
    }
    else if (result_count === 1) 
    {
        let results_title = document.createElement('h2');
        results_title.innerHTML = `Found a result for "${searched.join(' ')}"`;
        new_children.push(results_title);
    }
    else 
    {
        let results_title = document.createElement('h2');
        results_title.innerHTML = `Found ${result_count} results for "${searched.join(' ')}"`;
        new_children.push(results_title);
    }
}

function append_section_buttons(search_results, render_section, display_index, new_children) 
{
    bible.load_view().then(view => {
        let section_count = Math.ceil(search_results.length / MAX_DISPLAY);
        if(section_count <= 1)
        {
            return;
        }

        for (let i = 0; i < section_count; i++) 
        {
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
                render_section(i);
            });

            if (display_index === i) {
                button.style.border = "2px solid black";
            }

            new_children.push(button);
        }
    })
}

async function spawn_verse(words, searched, position, catagories, word_popup, side_popup, side_popup_content)
{
    searched = searched.map(s => s.toLocaleLowerCase());
    let verse_node = document.createElement('p');
    let offset = await bible.get_verse_word_offset(position.book, position.chapter, position.verse);
    let highlights = JSON.parse(await utils.invoke('get_chapter_highlights', { chapter: {
        book: position.book,
        number: position.chapter,
    }}));
    
    let last_word_highlights = null;
    for(let i = 0; i < words.length; i++)
    {
        let word_highlights = highlights[offset + i];

        if(i != 0)
        {
            let space = render.create_bible_space();

            if(word_highlights !== undefined && word_highlights !== null && word_highlights.length !== 0 && last_word_highlights !== null)
            {
                let overlap = utils.overlap(word_highlights, last_word_highlights);
                if(overlap.length !== 0)
                {
                    let space_highlight = render.get_highest_priority_highlight(overlap);
                    let space_color = catagories[space_highlight].color;
                    space = render.color(space, space_color);
                }
            }
            
            verse_node.appendChild(space);
        }

        let color = null;
        if(word_highlights !== null && word_highlights !== undefined && word_highlights.length !== 0)
        {
            let id = render.get_highest_priority_highlight(word_highlights, catagories);
            color = catagories[id].color;
            last_word_highlights = word_highlights;
        }
        else 
        {
            last_word_highlights = null;
        }

        let word_node = render_word(words[i], searched, color);
        if(word_highlights !== null && word_highlights !== undefined && word_highlights.length !== 0)
        {
            wp.display_on_div(word_node, word_highlights.map(h => catagories[h].color), word_popup);

            let word = utils.trim_string(words[i].text);
            sp.display_on_div(word_node, word, word_highlights, catagories, side_popup, side_popup_content);
        }

        let chapter = {
            book: position.book,
            number: position.chapter,
        }

        word_node.addEventListener('mousedown', e => {
            on_start_dragging(chapter, offset + i, word_node);
        });

        word_node.addEventListener('mouseover', e => {
            on_over_dragging(chapter, offset + i, word_node);
        });

        verse_node.appendChild(word_node);
    }
    
    return verse_node;
}

let is_dragging = false;
async function on_start_dragging(chapter, word_index, word_div) 
{
    if(get_selected_highlight() !== null)
    {
        is_dragging = true;
        update_word(chapter, word_index, word_div);
    }
}

async function on_over_dragging(chapter, word_index, word_div) 
{
    if(is_dragging && get_selected_highlight() !== null)
    {
        update_word(chapter, word_index, word_div);
    }
}

async function on_stop_dragging(result, results_id, searched, word_popup, side_popup, side_popup_content, display_index, on_search) 
{
    if(is_dragging && get_selected_highlight() !== null)
    {
        is_dragging = false;
        word_popup.classList.remove('show');

        let scroll = window.scrollY;

        render_search_result(result, results_id, searched, word_popup, side_popup, side_popup_content, display_index, on_search).then(() => {
            window.scrollTo(window.scrollX, scroll);
        });
    }
}

function update_word(chapter, word, div)
{
    div.style.color = render.HIGHLIGHT_SELECTED_WORD_COLOR;
    if(utils.get_toggle_value(ERASER_STATE_NAME) !== true)
    {
        highlight_word(chapter, word, get_selected_highlight());
    }
    else 
    {
        erase_highlight(chapter, word, get_selected_highlight());
    }
}

async function spawn_reference(book, chapter, verse, on_search)
{
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

function render_word(word, searched, color)
{
    let word_node = render.create_bible_word(word.text);
    if (word.italicized)
    {
        word_node = render.italicize(word_node);
    }
    
    if (searched.includes(utils.trim_string(word.text).toLocaleLowerCase()))
    {
        word_node = render.bold(word_node);
    }

    if(color !== null)
    {
        word_node = render.color(word_node, color);
    }

    return word_node
}