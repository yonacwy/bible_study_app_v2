import { get_catagories, get_chapter_annotations } from "./highlights.js";
import { color_to_hex } from "./utils.js";
export function display_on_div(div, colors, popup) {
    div.addEventListener('mouseenter', _ => {
        popup.replaceChildren();
        colors.forEach(color => {
            let child = document.createElement('div');
            child.classList.add('color-square');
            child.style.backgroundColor = color_to_hex(color);
            popup.appendChild(child);
        });
    });
    div.addEventListener('mousemove', (event) => {
        popup.classList.add('show');
        popup.style.left = event.pageX + 10 + 'px'; // Position the popup 10px to the right of the mouse
        popup.style.top = event.pageY + 10 + 'px'; // Position the popup 10px below the mouse
    });
    div.addEventListener('mouseleave', () => {
        popup.classList.remove('show');
    });
}
export async function init_word_popup_for_chapter(chapter, popup_id, content_id) {
    let highlight_catagories = await get_catagories();
    let chapter_highlights = await get_chapter_annotations(chapter);
    let chapter_content = document.getElementById(content_id);
    if (chapter_content === null)
        return;
    let word_divs = chapter_content.getElementsByClassName('bible-word');
    const popup = document.getElementById(popup_id);
    if (popup === null)
        return;
    for (let i = 0; i < word_divs.length; i++) {
        let word_div = word_divs[i];
        let word_annotations = chapter_highlights[i];
        if (word_annotations === undefined || word_annotations === null || word_annotations.highlights.length === 0) {
            continue;
        }
        let colors = word_annotations.highlights.map((h) => highlight_catagories[h].color);
        display_on_div(word_div, colors, popup);
    }
}
