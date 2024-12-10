import { ChapterIndex, Color, HighlightCategory } from "../bindings.js";
import { get_categories, get_chapter_annotations, SELECTED_HIGHLIGHT } from "../highlights.js";
import { color_to_hex, debug_print } from "../utils/index.js";

const HIGHLIGHT_CATEGORIES = await get_categories();

// if we are hovering over something while we erase it, this makes sure that the element hides itself
let current_ids: string[] = [];
export function init_word_popup(popup: HTMLElement)
{
    document.addEventListener('click', e => {
        let selected_highlight = SELECTED_HIGHLIGHT.get();
        if(selected_highlight !== null && current_ids.includes(selected_highlight))
        {
            popup.classList.remove('show');
        }
    });
}

export function display_on_div(div: HTMLElement, highlight_ids: string[], has_note: boolean, popup: HTMLElement) 
{
    div.addEventListener('mouseenter', _ => {
        popup.replaceChildren();
        highlight_ids.forEach(id => {
            let highlight = HIGHLIGHT_CATEGORIES[id] as HighlightCategory;
            let child = document.createElement('div');
            child.classList.add('color-square');
            child.style.backgroundColor = color_to_hex(highlight.color);
            popup.appendChild(child);
        });

        current_ids = highlight_ids;

        if(has_note)
        {
            let img = document.createElement('img');
            img.src = '../images/light-note.svg';
    
            let div = document.createElement('div');
            div.classList.add('img-square');
            div.appendChild(img);
            popup.appendChild(div);
        }
    })

    div.addEventListener('mousemove', (event) => {
        popup.classList.add('show');
        popup.style.left = event.pageX + 10 + 'px';  // Position the popup 10px to the right of the mouse
        popup.style.top = event.pageY + 10 + 'px';   // Position the popup 10px below the mouse
    });

    div.addEventListener('mouseleave', () => {
        popup.classList.remove('show');
    });
}