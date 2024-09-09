import { get_catagories, get_chapter_highlights } from "./highlights.js";
import { color_to_hex, debug_print } from "./utils.js";

export async function init_word_popup(popup_id, content_id) 
{
    let highlight_catagories = await get_catagories();
    let chapter_highlights = await get_chapter_highlights();

    let chapter_content = document.getElementById(content_id);
    let word_divs = chapter_content.getElementsByClassName('bible-word');
    
    const popup = document.getElementById(popup_id);
    
    for(let i = 0; i < word_divs.length; i++)
    {
        let word_div = word_divs[i];

        let word_highlights = chapter_highlights[i];
        if(word_highlights === undefined || word_highlights === null) { continue; }

        word_div.addEventListener('mouseenter', _ => {
            popup.replaceChildren();

            for(let j = 0; j < word_highlights.length; j++)
            {
                let highlight_id = word_highlights[j];
                let child = document.createElement('div');
                child.classList.add('color-square');
                child.style.backgroundColor = color_to_hex(highlight_catagories[highlight_id].color);
                popup.appendChild(child);
            }
        })

        word_div.addEventListener('mousemove', (event) => {
            popup.classList.add('show');
            popup.style.left = event.pageX + 10 + 'px';  // Position the popup 10px to the right of the mouse
            popup.style.top = event.pageY + 10 + 'px';   // Position the popup 10px below the mouse
        });

        word_div.addEventListener('mouseleave', () => {
            popup.classList.remove('show');
        });
    }
}