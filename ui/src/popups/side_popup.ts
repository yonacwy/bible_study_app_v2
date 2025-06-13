import { Color, HighlightCategories, ReferenceLocation, WordAnnotations } from "../bindings.js";
import * as highlight_utils from "../highlights.js";
import * as utils from "../utils/index.js";
import * as notes from "../notes.js";
import * as view_states from "../view_states.js";
import { get_ui_scale } from "../settings.js";
import { render_note_data } from "../rendering/note_rendering.js";
import { goto_highlight_editor_page } from "../page_scripts/highlight_editor.js";

const INITIAL_WIDTH = 250;
const WIDTH_STORAGE_NAME = "side-popup-width-value";
const CATEGORIES: HighlightCategories = await highlight_utils.get_categories();

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

    let min = await get_min_panel_width();
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
        clamp_panel_size();
    });
}

export function display_on_div(args: { 
    div: HTMLElement; 
    word: string; 
    annotations: WordAnnotations | null; 
    panel_data: PanelData; 
    on_search: (msg: string) => void;
    location: ReferenceLocation,
})
{
    let { div, word, annotations, panel_data, on_search, location } = args;

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
        build_popup_content(word, annotations, panel_data.popup_panel_content, on_search, location)
    })
}

async function build_popup_content(word: string, annotations: WordAnnotations, target: Element, on_search: (msg: string) => void, location: ReferenceLocation)
{
    target.append_element('div', ['panel-title'], div => {
        div.innerHTML = `"${word}"`;
    });

    append_highlights(annotations, target, on_search);
    let r = await append_notes(annotations, target, on_search, location);
    return r;
}

async function append_notes(annotations: WordAnnotations, target: Element, on_search: (msg: string) => void, location: ReferenceLocation) 
{
    for (let i = 0; i < annotations.notes.length; i++) 
    {
        let id = annotations.notes[i];
        let note_data = await notes.get_note(id);
        let references = await notes.get_note_references(note_data);
        target.append_element('div', ['note-viewer'], div => {
            let edit_btn = utils.spawn_image_button(utils.images.PENCIL, _ => {
                view_states.goto_edit_note_page(id, location);
            });
            edit_btn.button.title = 'Edit note';

            edit_btn.button.style.float = 'right';
            div.appendChild(edit_btn.button);

            div.append_element('div', ['note-content'], content => {
                render_note_data(note_data, on_search, content);
            });
            div.append_element('div', ['reference-buttons'], grid => {
                references.forEach(ref => {
                    grid.append_element('button', [], button => {
                        button.innerHTML = `${ref[0]}: '${ref[1]}'`;
                        button.title = `Go to ${ref[0]}`;
                        button.addEventListener('click', _ => {
                            on_search(ref[0]);
                        });
                    });
                });
            });
        })
    }
}

function append_highlights(annotations: WordAnnotations, target: Element, on_search: (msg: string) => void) 
{
    for (let i = 0; i < annotations.highlights.length; i++) 
    {
        let id = annotations.highlights[i];
        let name = CATEGORIES[id].name;
        let color = CATEGORIES[id].color;
        let description = CATEGORIES[id].description;
        let source_type = CATEGORIES[id].source_type;

        target.append_element('div', ['highlight-viewer'], div => {
            div.append_element('div', ['color-bar'], color_bar => {
                color_bar.style.backgroundColor = utils.color_to_hex(color);
            });

            div.append_element('div', ['highlight-content'], content => {
                content.append_element('div', ['highlight-title'], title => {
                    title.append_element('div', ['title-text'], title_text => {
                        title_text.innerHTML = name;
                    });
    
                    let edit_btn = utils.spawn_image_button('../images/light-pencil.svg', e => {
                        goto_highlight_editor_page(id);
                    }, title);
                    edit_btn.button.title = 'Edit category';
                });

                content.append_element('div', [], async desc => {
                    render_note_data({ 
                        source_type,
                        text: description,
                    }, on_search, desc);
                });
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

async function get_min_panel_width(): Promise<number>
{
    let min_window = document.documentElement.clientWidth * 0.2;

    // when the ui is scaled up, will add up to 50px extra to the minimum content size
    // this fixes some issues with the reference buttons not displaying properly
    let ui_scale = await get_ui_scale();
    let absolute_min = 200 + 150 * Math.inv_lerp(0.5, 2.0, ui_scale);

    return Math.max(min_window, absolute_min);
}

async function get_max_panel_width(): Promise<number>
{
    let max_window = document.documentElement.clientWidth * 0.75;
    let absolute_max = await get_min_panel_width();

    // makes sure that the max width cannot be less than the min width
    return Math.max(max_window, absolute_max); 
}

async function resize_panel(e: Event) 
{
    if (is_resizing && resizing_panel !== null) 
    {
        let min = await get_min_panel_width();
        let max = await get_max_panel_width();

        let new_width = window.innerWidth - (e as DragEvent).clientX;
        new_width = utils.clamp(min, max, new_width);

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

async function clamp_panel_size()
{
    if (resizing_panel !== null && resizing_panel.classList.contains('open'))
    {
        let min = await get_min_panel_width();
        let max = await get_max_panel_width();
        let current = resizing_panel.clientWidth;
        resizing_panel.style.width = Math.clamp(min, max, current) + 'px';
    }
}

function stop_resize() 
{
    is_resizing = false;
    document.removeEventListener('mousemove', resize_panel);
    document.removeEventListener('mouseup', stop_resize);
}