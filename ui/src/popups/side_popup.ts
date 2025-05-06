import { Color, WordAnnotations } from "../bindings.js";
import * as highlight_utils from "../highlights.js";
import * as utils from "../utils/index.js";
import * as notes from "../notes.js";
import * as view_states from "../view_states.js";
import { get_ui_scale } from "../settings.js";
import { render_note_data } from "../rendering/note_rendering.js";

const INITIAL_WIDTH = 250;
const WIDTH_STORAGE_NAME = "side-popup-width-value";
const CATEGORIES: any = await highlight_utils.get_categories();

export type PanelData = {
    popup_panel: HTMLElement,
    popup_panel_content: HTMLElement
}

export async function init_popup_panel(id: string) 
{
    const panel = document.getElementById(id);
    if (panel === null) return;

    const resizer = panel.getElementsByClassName('resizer')[0];
    if (!resizer) return;

    resizer.addEventListener('mousedown', e => {
        init_resize(e);
    });

    let min = await get_min_panel_size();
    panel.style.width = `${min}px`;
    
    resizing_panel = panel;
    resizer_line = resizer as HTMLElement;
    
    resizing_panel.addEventListener('scroll', e => {
        update_resizer_size();
    });

    resizing_panel.addEventListener('mousemove', e => {
        update_resizer_size();
    });

    window.addEventListener('resize', e => {
        update_resizer_size();
    });
}

export function display_on_div(div: HTMLElement, word: string, annotations: WordAnnotations | null, panel_data: PanelData, on_search: (msg: string) => void)
{
    div.addEventListener('click', e => {
        if(annotations === null          ||
            annotations === undefined     ||
           (annotations.notes.length === 0 && annotations.highlights.length === 0)
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
    let r = await append_notes(annotations, target, on_search);
    return r;
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
            let edit_btn = utils.spawn_image_button(utils.images.PENCIL, _ => {
                notes.set_editing_note(note_data.id).then(_ => {
                    view_states.goto_current_view_state();
                });
            });

            edit_btn.button.style.float = 'right';
            div.appendChild(edit_btn.button);

            div.appendElement('div', content => {
                content.classList.add('note-content');
                render_note_data(note_data, on_search, content);
            });
            div.appendElement('div', grid => {
                grid.classList.add('reference-buttons')
                references.forEach(ref => {
                    grid.appendElement('button', button => {
                        button.innerHTML = `${ref[0]}: '${ref[1]}'`;
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
        let name: string = CATEGORIES[id].name;
        let color: Color = CATEGORIES[id].color;
        let description: string = CATEGORIES[id].description;

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
                content.appendElement('div', desc => desc.innerHTML = utils.render_markdown(description));
            })
        });
    }
}


let is_resizing = false;
let resizing_panel: HTMLElement | null = null;
let resizer_line: HTMLElement | null = null;

function init_resize(e: Event) 
{
    is_resizing = true;

    document.addEventListener('mousemove', resize_panel);
    document.addEventListener('mouseup', stop_resize);
    e.preventDefault();
}

async function get_min_panel_size(): Promise<number> 
{
    let min = 200;
    let ui_scale = await get_ui_scale();
    // when the ui is scaled up, will add up to 50px extra to the minimum content size
    // this fixes some issues with the reference buttons not displaying properly
    min += 150 * Math.inv_lerp(0.5, 2.0, ui_scale);
    return min;
}

async function resize_panel(e: Event) 
{
    if (is_resizing && resizing_panel !== null) 
    {
        let min = await get_min_panel_size();

        let new_width = window.innerWidth - (e as DragEvent).clientX;
        new_width = utils.clamp(min, 500, new_width);

        resizing_panel.style.width = new_width + 'px';
        sessionStorage.setItem(WIDTH_STORAGE_NAME, `${new_width}`);
    }
}

function update_resizer_size()
{
    if(!resizing_panel || !resizer_line) return;
    let top = resizing_panel.scrollTop;
    resizer_line.style.top = `${top}px`;
}

function stop_resize() 
{
    is_resizing = false;
    document.removeEventListener('mousemove', resize_panel);
    document.removeEventListener('mouseup', stop_resize);
}