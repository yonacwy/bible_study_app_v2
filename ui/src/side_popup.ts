import { Color, WordAnnotations } from "./bindings.js";
import { get_catagories, get_selected_highlight } from "./highlights.js";
import * as utils from "./utils/index.js";
import * as notes from "./notes.js";
import * as view_states from "./view_states.js";

const INITIAL_WIDTH = 250;
const WIDTH_STORAGE_NAME = "side-popup-width-value";
const CATAGORIES: any = await get_catagories();

export type PanelData = {
    popup_panel: HTMLElement,
    popup_panel_content: HTMLElement
}

export async function init_popup_panel(id: string) 
{
    const panel = document.getElementById(id);
    if (panel === null) return;
    const resizer = panel.getElementsByClassName('resizer')[0];
    resizer.addEventListener('mousedown', e => {
        init_resize(e, panel);
    });
}

export function display_on_div(div: HTMLElement, word: string, annotations: WordAnnotations | null, panel_data: PanelData, on_search: (msg: string) => void)
{
    div.addEventListener('click', e => {
        if(annotations === null          ||
            annotations === undefined     ||
           (annotations.notes.length === 0 && annotations.highlights.length === 0)      ||
           get_selected_highlight() !== null
        )
        {
            panel_data.popup_panel.classList.remove('open');
            panel_data.popup_panel_content.innerHTML = "";
            return;
        }
        
        panel_data.popup_panel.classList.add('open');
        panel_data.popup_panel_content.replaceChildren();
        build_popup_content(word, annotations, panel_data.popup_panel_content, on_search)
    })
}

async function build_popup_content(word: string, annotations: WordAnnotations, target: Element, on_search: (msg: string) => void)
{
    target.appendElement('div', div => {
        div.classList.add('panel-title');
        div.innerHTML = `"${word}"`;
    });

    append_highlights(annotations, target);
    await append_notes(annotations, target, on_search);
}

async function append_notes(annotations: WordAnnotations, target: Element, on_search: (msg: string) => void) 
{
    for (let i = 0; i < annotations.notes.length; i++) 
    {
        let id = annotations.notes[i];
        let note_data = await notes.get_note(id);
        let references = await notes.get_note_references(note_data);
        target.appendElement('div', div => {
            div.classList.add('note-viewer');
            div.appendElement('button', button => {
                button.classList.add('edit-btn');
                button.addEventListener('click', e => {
                    notes.set_editing_note(note_data.id).then(_ => {
                        view_states.goto_current_view_state();
                    });
                })
                button.appendElement('img');
            });
            div.appendElement('div', content => {
                content.classList.add('note-content');
                content.innerHTML = utils.render_markdown(note_data.text);
            });
            div.appendElement('div', grid => {
                grid.classList.add('reference-buttons')
                references.forEach(ref => {
                    grid.appendElement('button', button => {
                        button.innerHTML = `${ref[0]}:'${ref[1]}'`;
                        button.addEventListener('click', e => {
                            on_search(ref[0]);
                        });
                    });
                });
            });
        })
    }
}

function append_highlights(annotations: WordAnnotations, target: Element) 
{
    for (let i = 0; i < annotations.highlights.length; i++) 
    {
        let id = annotations.highlights[i];
        let name: string = CATAGORIES[id].name;
        let color: Color = CATAGORIES[id].color;
        let description: string = CATAGORIES[id].description;

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
            })
        });
    }
}


let is_resizing = false;
let resizing_panel: HTMLElement | null = null;

function init_resize(e: Event, panel: HTMLElement) 
{
    is_resizing = true;
    resizing_panel = panel;
    document.addEventListener('mousemove', resize_panel);
    document.addEventListener('mouseup', stop_resize);
    e.preventDefault();
}

function resize_panel(e: Event) 
{
    if (is_resizing && resizing_panel !== null) 
    {
        let new_width = window.innerWidth - (e as DragEvent).clientX;
        new_width = utils.clamp(200, 500, new_width);

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