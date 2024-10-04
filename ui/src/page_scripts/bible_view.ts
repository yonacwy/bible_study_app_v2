import * as utils from "../utils.js";
import * as bible from "../bible.js";
import { get_selected_highlight } from "../highlights.js";

export async function init_chapter_buttons(previous: string, next: string, on_render: () => void)
{
    utils.on_click(previous, e => {
        bible.to_previous_chapter().then(() => {
            utils.reset_scroll();
            on_render();
        })
    });

    utils.on_click(next, e => {
        bible.to_next_chapter().then(() => {
            on_render();
        })
    })
}

export async function update_word_selection()
{
    if(get_selected_highlight() !== null)
    {
        document.querySelectorAll('.bible-word, .bible-space').forEach(w => {
            (w as HTMLElement).style.userSelect = 'none';
            (w as HTMLElement).style.cursor = 'pointer';
        });
    }
    else 
    {
        document.querySelectorAll('.bible-word, .bible-space').forEach(w => {
            (w as HTMLElement).style.userSelect = 'text';
            (w as HTMLElement).style.cursor = 'default';
        });
    }
}