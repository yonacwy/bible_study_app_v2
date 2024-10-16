import { get_selected_highlight } from "./highlights.js";
import { clamp, color_to_hex } from "./utils.js";
const INITIAL_WIDTH = 250;
const WIDTH_STORAGE_NAME = "side-popup-width-value";
export async function init_popup_panel(id) {
    const panel = document.getElementById(id);
    if (panel === null)
        return;
    const resizer = panel.getElementsByClassName('resizer')[0];
    resizer.addEventListener('mousedown', e => {
        init_resize(e, panel);
    });
}
export function display_on_div(div, word, word_highlights, catagories, panel, content) {
    div.addEventListener('click', e => {
        if (word_highlights === null ||
            word_highlights === undefined ||
            word_highlights.length === 0 ||
            get_selected_highlight() !== null) {
            panel.classList.remove('open');
            content.innerHTML = "";
            return;
        }
        panel.classList.add('open');
        content.innerHTML = "";
        content.innerHTML += `
            <div class="panel-title">
                <h2>"${word.toUpperCase()}"</h2>
            </div>
            <hr>
            <hr>
        `;
        for (let j = 0; j < word_highlights.length; j++) {
            let id = word_highlights[j];
            let name = catagories[id].name;
            let description = catagories[id].description;
            let color = catagories[id].color;
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
    });
}
let is_resizing = false;
let resizing_panel = null;
function init_resize(e, panel) {
    is_resizing = true;
    resizing_panel = panel;
    document.addEventListener('mousemove', resize_panel);
    document.addEventListener('mouseup', stop_resize);
    e.preventDefault();
}
function resize_panel(e) {
    if (is_resizing && resizing_panel !== null) {
        let new_width = window.innerWidth - e.clientX;
        new_width = clamp(200, 500, new_width);
        resizing_panel.style.width = new_width + 'px';
        sessionStorage.setItem(WIDTH_STORAGE_NAME, `${new_width}`);
    }
}
function stop_resize() {
    is_resizing = false;
    document.removeEventListener('mousemove', resize_panel);
    document.removeEventListener('mouseup', stop_resize);
    resizing_panel = null;
}
