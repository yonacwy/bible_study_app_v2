import { Color } from "./bindings.js";
import { get_catagories, get_chapter_annotations } from "./highlights.js";
import { color_to_hex, debug_print } from "./utils.js";

export function display_on_div(div: HTMLElement, colors: Color[], popup: HTMLElement) 
{
    div.addEventListener('mouseenter', _ => {
        popup.replaceChildren();
        colors.forEach(color => {
            let child = document.createElement('div');
            child.classList.add('color-square');
            child.style.backgroundColor = color_to_hex(color);
            popup.appendChild(child);
        });
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

export async function init_word_popup_for_chapter(popup_id: string, content_id: string) 
{
    let highlight_catagories = await get_catagories();
    let chapter_highlights = await get_chapter_annotations();

    let chapter_content = document.getElementById(content_id);
    if(chapter_content === null) return;
    let word_divs = chapter_content.getElementsByClassName('bible-word');
    
    const popup = document.getElementById(popup_id);
    if (popup === null) return;
    
    for(let i = 0; i < word_divs.length; i++)
    {
        let word_div = word_divs[i] as HTMLElement;

        let word_annotations = chapter_highlights[i];
        if(word_annotations === undefined || word_annotations === null || word_annotations.highlights.length === 0) { continue; }

        let colors = word_annotations.highlights.map((h: string | number) => highlight_catagories[h].color);
        display_on_div(word_div, colors, popup);
    }
}