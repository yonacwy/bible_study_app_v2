import { get_catagories, get_selected_highlight } from "./highlights.js";
import * as utils from "./utils/index.js";
import * as notes from "./notes.js";
import * as md from "./md/index.js";
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
export function display_on_div(div, word, annotations, panel, content, on_search) {
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
        build_popup_content(word, annotations, content, on_search);
    });
}
async function build_popup_content(word, annotations, target, on_search) {
    target.appendElement('div', div => {
        div.classList.add('panel-title');
        div.innerHTML = `"${word}"`;
    });
    append_highlights(annotations, target);
    await append_notes(annotations, target, on_search);
}
async function append_notes(annotations, target, on_search) {
    for (let i = 0; i < annotations.notes.length; i++) {
        let id = annotations.notes[i];
        let note_data = await notes.get_note(id);
        let references = await notes.get_note_references(note_data);
        target.appendElement('div', div => {
            div.classList.add('note-viewer');
            div.appendElement('div', content => {
                content.classList.add('note-content');
                content.innerHTML = note_data.text;
                utils.debug_print(md.Marked.parse(note_data.text));
            });
            div.appendElement('div', grid => {
                grid.classList.add('reference-buttons');
                references.forEach(ref => {
                    grid.appendElement('button', button => {
                        button.innerHTML = `${ref[0]}:'${ref[1]}'`;
                        button.addEventListener('click', e => {
                            on_search(ref[0]);
                        });
                    });
                });
            });
        });
    }
}
function append_highlights(annotations, target) {
    for (let i = 0; i < annotations.highlights.length; i++) {
        let id = annotations.highlights[i];
        let name = CATAGORIES[id].name;
        let color = CATAGORIES[id].color;
        let description = CATAGORIES[id].description;
        target.appendElement('div', div => {
            div.classList.add('highlight-viewer');
            div.appendElement('div', color_bar => {
                color_bar.classList.add('color-bar');
                color_bar.style.backgroundColor = utils.color_to_hex(color);
            });
            div.appendElement('div', content => {
                content.classList.add('highlight-content');
                content.appendElement('div', title => {
                    title.classList.add('highlight-title');
                    title.innerHTML = name;
                });
                content.appendElement('p', desc => desc.innerHTML = description);
            });
        });
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
