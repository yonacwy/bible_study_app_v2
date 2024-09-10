import { get_chapter_words } from "./bible.js";
import { get_catagories, get_chapter_highlights } from "./highlights.js";
import { debug_print, clamp, color_to_hex } from "./utils.js";

const INITIAL_WIDTH = 250;
const WIDTH_STORAGE_NAME = "side-popup-width-value";

export async function init_popup_panel(id, content_id)
{
    let chapter_highlights = await get_chapter_highlights();
    let catagories = await get_catagories();
    let chapter_words = await get_chapter_words();
    
    let initial_width = sessionStorage.getItem(WIDTH_STORAGE_NAME) ?? INITIAL_WIDTH;
    const panel = document.getElementById(id);
    panel.style.width = initial_width + 'px';

    const resizer = panel.getElementsByClassName('resizer')[0];
    const content = panel.getElementsByClassName('popup-panel-content')[0];

    resizer.addEventListener('mousedown', e => {
        init_resize(e, panel);
    });

    let word_divs = document.getElementById(content_id).getElementsByClassName('bible-word');
    for(let i = 0; i < word_divs.length; i++)
    {
        word_divs[i].addEventListener('click', e => {
            let word_highlights = chapter_highlights[i];
            if(word_highlights === null || word_highlights === undefined || word_highlights.length === 0)
            {
                panel.classList.remove('open');
                content.innerHTML = "";
                return;
            }

            panel.classList.add('open');
            content.innerHTML = "";
            
            let word = chapter_words[i].toUpperCase();
            content.innerHTML += `
                <div class="panel-title">
                    <h2>"${word}"</h2>
                </div>
                <hr>
                <hr>
            `;
            for(let j = 0; j < word_highlights.length; j++)
            {
                let id = word_highlights[j];
                let name = catagories[id].name;
                let description = catagories[id].description;
                let color =  catagories[id].color;

                content.innerHTML += `
                    <div class="panel-info">
                    <div class="info-title" style="display: flex">
                        <h3>${name}</h3>
                        <div class="color-square" style="background-color: ${color_to_hex(color)}"></div>
                    </div>
                    <p>${description}</p>
                    </div>
                    <hr>
                `;
            }
        })
    }
}

let is_resizing = false;
let resizing_panel = null;

function init_resize(e, panel) 
{
    is_resizing = true;
    resizing_panel = panel;
    document.addEventListener('mousemove', resize_panel);
    document.addEventListener('mouseup', stop_resize);
    e.preventDefault();
}

function resize_panel(e) 
{
    if (is_resizing) 
    {
        let new_width = window.innerWidth - e.clientX;
        new_width = clamp(200, 500, new_width);

        resizing_panel.style.width = new_width + 'px';
        sessionStorage.setItem(WIDTH_STORAGE_NAME, `${new_width}`);
    }
}

function stop_resize() 
{
    is_resizing = false;
    document.removeEventListener('mousemove', resize_panel);
    document.removeEventListener('mouseup', stop_resize);
    resizing_panel = null;
}