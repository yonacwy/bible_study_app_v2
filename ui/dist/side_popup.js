import { get_catagories, get_selected_highlight } from "./highlights.js";
import * as utils from "./utils.js";
import * as notes from "./notes.js";
const INITIAL_WIDTH = 250;
const WIDTH_STORAGE_NAME = "side-popup-width-value";
const CATAGORIES = await get_catagories();
export async function init_popup_panel(id) {
    const panel = document.getElementById(id);
    if (panel === null)
        return;
    const resizer = panel.getElementsByClassName('resizer')[0];
    resizer.addEventListener('mousedown', e => {
        init_resize(e, panel);
    });
}
export function display_on_div(div, word, annotations, panel, content) {
    div.addEventListener('click', e => {
        if (annotations === null ||
            annotations === undefined ||
            (annotations.notes.length === 0 && annotations.highlights.length === 0) ||
            get_selected_highlight() !== null) {
            panel.classList.remove('open');
            content.innerHTML = "";
            return;
        }
        panel.classList.add('open');
        content.replaceChildren();
        build_popup_content(word, annotations, content);
    });
}
async function build_popup_content(word, annotations, target) {
    target.appendElement('div', div => {
        div.classList.add('panel-title');
        div.appendElement('h2', header => {
            header.innerHTML = word.toUpperCase();
        });
    });
    target.appendElement('hr');
    target.appendElement('hr');
    append_highlights(annotations, target);
    await append_notes(annotations, target);
}
async function append_notes(annotations, target) {
    for (let i = 0; i < annotations.notes.length; i++) {
        let id = annotations.notes[i];
        let note_data = await notes.get_note(id);
        target.appendElement('h6', async (header) => {
            header.innerHTML = await notes.get_note_references(note_data).then(r => r.join('; '));
        });
        target.appendElement('p', p => {
            p.innerHTML = note_data.text;
        });
        target.appendElement('hr');
    }
}
function append_highlights(annotations, target) {
    for (let i = 0; i < annotations.highlights.length; i++) {
        let id = annotations.highlights[i];
        let name = CATAGORIES[id].name;
        let color = CATAGORIES[id].color;
        let description = CATAGORIES[id].description;
        target.appendElement('div', div => {
            div.classList.add('panel-info');
            div.appendElement('div', title => {
                title.classList.add('info-title');
                title.style.display = 'flex';
                title.appendElement('h3', header => {
                    header.innerHTML = name;
                });
                title.appendElement('div', square => {
                    square.style.backgroundColor = utils.color_to_hex(color);
                    square.classList.add('color-square');
                });
            });
            div.appendElement('p', p => {
                p.innerHTML = description;
            });
        });
        target.appendElement('hr');
    }
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
        new_width = utils.clamp(200, 500, new_width);
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
