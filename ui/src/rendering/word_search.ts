import * as utils from "../utils/index.js";
import * as bible from "../bible.js";
import { push_word_search } from "../view_states.js";
import { ReferenceLocation, VersePosition } from "../bindings.js";
import * as verse_renderer from "./verse_rendering.js";
import { PanelData } from "../popups/side_popup.js";
import * as selection from "../selection.js";

const MAX_DISPLAY = 50;
let was_initialized = false;

export type WordSearchResult = {
    book: number,
    chapter: number,
    verse: number,
}

/**
 * Initializes the rendering of a search result. 
 * When display index is set, will automatically rerender the page
 * @param on_rendered -- Will be called when the display index changes
 * @param on_search -- Called when a search for a verse is called
 */
export async function render_search_result(args: { 
    result: WordSearchResult[]; 
    searched: string[]; 
    results_id: string; 
    word_popup: HTMLElement; 
    side_popup_data: PanelData | null; 
    display_index: number; 
    on_rendered: () => void; 
    on_search: (msg: string) => void; 
    editing_note_location: ReferenceLocation | null,
}): Promise<void>
{
    let { result, searched, results_id, word_popup, side_popup_data, display_index, on_rendered, on_search } = args;
    if(!was_initialized)
    {
        was_initialized = true;
        let on_require_rerender = () => render_search_result(args);
        
        selection.init_selection();
        selection.ON_SELECTION_EVENT.add_listener(e => {
            on_require_rerender();
        })
    }

    selection.clear_selection_ranges();
    const results_node = document.getElementById(results_id);
    if(results_node === null) return;
    results_node.style.pointerEvents = 'none';
    
    let result_count = result.length;
    let new_children: HTMLElement[] = [];
    
    append_search_header(result_count, new_children, searched);
    
    let start = display_index * MAX_DISPLAY;
    let end = Math.min(result_count, MAX_DISPLAY + start);

    let note_verses: HTMLElement[] = [];

    for(let i = start; i < end; i++)
    {
        let result_data = result[i] as VersePosition;

        let verse_node = await spawn_verse(result_data, searched, word_popup,  side_popup_data, on_search);

        let word_offset = await bible.get_verse_word_offset(result_data.book, result_data.chapter, result_data.verse);
        selection.push_selection_range(verse_node, {book: result_data.book, number: result_data.chapter}, word_offset);
        
        let reference_node = await spawn_reference(result_data.book, result_data.chapter, result_data.verse, on_search);

        let result_node = document.createElement('div');
        result_node.classList.add('verse');
        result_node.id = await format_reference_id(result_data.book, result_data.chapter, result_data.verse);
        result_node.appendChild(verse_node);
        result_node.appendChild(reference_node);
        new_children.push(result_node);

        if (args.editing_note_location !== null)
        {
            // utils.debug_json(args.editing_note_location);

            let is_same_book = args.editing_note_location.chapter.book === result_data.book;
            let is_same_chapter = args.editing_note_location.chapter.number === result_data.chapter;
            let is_in_verse_range = args.editing_note_location.range.verse_start <= result_data.verse &&
                                    args.editing_note_location.range.verse_end >= result_data.verse;

            if (is_same_book && is_same_chapter && is_in_verse_range)
            {
                note_verses.push(result_node);
            }
        }
    }

    function on_element_clicked()
    {
        note_verses.forEach(e => {
            e.removeEventListener('click', on_element_clicked);
            e.classList.remove('searched');
        });
    }

    note_verses.forEach(e => {
        e.addEventListener('click', on_element_clicked);
        e.classList.add('searched');
    })

    let render_section = (i: number) => {
        args.display_index = i;
        render_search_result(args);
    };
    let buttons = await generate_section_buttons(result, render_section, display_index, searched);
    if(buttons !== null)
    {
        new_children.push(buttons);
    }

    results_node.replaceChildren(...new_children);
    results_node.style.pointerEvents = 'auto';
    on_rendered();

    if (note_verses.length > 0)
    {
        note_verses[0].scrollIntoView({
            block: 'center',
            behavior: 'smooth',
        });
    }
}

function append_search_header(result_count: number, new_children: HTMLElement[], searched: string[]) 
{
    let results_title = document.createElement('h2');
    if (result_count === 0) 
    {
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

async function generate_section_buttons(search_results: any[], render_section: (index: number) => void, display_index: number, searched: string[]): Promise<HTMLElement | null>
{
    let view = await bible.get_bible_view();

    let section_count = Math.ceil(search_results.length / MAX_DISPLAY);
    if(section_count <= 1)
    {
        return null;
    }

    let parent = document.createElement('div');
    parent.classList.add('selection-buttons');

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
            push_word_search(searched, i);
            render_section(i);
        });

        if (display_index === i) {
            button.classList.add('selected-button')
        }

        parent.appendChild(button);
    }

    return parent;
}

async function spawn_verse(position: VersePosition, searched: string[], word_popup: HTMLElement, side_popup_data: PanelData | null, on_search: (msg: string) => void)
{
    searched = searched.map(s => s.toLocaleLowerCase());
    let verse_node = document.createElement('p');
    
    let elements = await verse_renderer.render_verse({
        chapter: { book: position.book, number: position.chapter},
        verse: position.verse,
        word_popup: word_popup,
        side_popup_data: side_popup_data,
        bolded: searched,
        on_search: on_search
    });

    verse_node.append(...elements);
    return verse_node;
}

export async function format_reference_id(book: number, chapter: number, verse: number): Promise<string>
{
    let book_title = await bible.get_book_name(book);
    return `${book_title} ${chapter + 1}:${verse + 1}`;
}

async function spawn_reference(book: number, chapter: number, verse: number, on_search: (text: string) => void)
{
    let book_title = await bible.get_book_name(book);
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