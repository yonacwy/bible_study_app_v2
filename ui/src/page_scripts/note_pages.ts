import * as utils from "../utils/index.js";
import * as notes from "../notes.js";
import * as view_states from "../view_states.js";
import * as confirm_popup from "../popups/confirm_popup.js";
import * as word_select from "../word_select.js";
import * as bible from "../bible.js";

const DELETE_NOTE_BUTTON = 'delete-note-btn'

export async function init_note_page(note_id: string, on_text_require_rerender: () => void): Promise<void>
{
    Promise.all([
        init_resizer(),
        render_reference_dropdown(on_text_require_rerender),
        init_editor_toggle(note_id),
        init_delete_note_button(note_id),
        init_close_editor_btn(),
        init_save_callbacks(),
    ]);
}

function init_delete_note_button(note_id: string)
{
    let button = document.getElementById(DELETE_NOTE_BUTTON);

    button?.addEventListener('click', _ => {
        confirm_popup.show_confirm_popup({
            message: 'Are you sure you want to delete this note?',
            on_confirm: delete_note
        });
    });

    function delete_note()
    {
        document.body.style.visibility = 'hidden';
        notes.delete_note(note_id).then(() => {
            notes.set_editing_note(null).then(() => {
                view_states.goto_current_view_state();
            });
        });
    }
}

const CLOSE_EDITOR_BUTTON = 'close-editor-btn';
function init_close_editor_btn()
{
    let button = document.getElementById(CLOSE_EDITOR_BUTTON);
    if(!button) return;

    button.addEventListener('click', _ => {
        apply_transitions();
        collapse_pane(PaneSideType.Right);
        notes.set_editing_note(null).then(_ => {
            view_states.goto_current_view_state();
        });
    });
}

const TEXT_EDITOR_NAME = 'editor-text';
function init_save_callbacks()
{
    const textarea = document.getElementById(TEXT_EDITOR_NAME) as HTMLTextAreaElement;
    let save_callback = async (e: Event) =>
    {
        let current = await notes.get_editing_note();
        if(current === null) return;
        
        let new_text = textarea.value;

        let locations = (await notes.get_note(current)).locations;
        notes.update_note(current, locations, new_text);
    }

    textarea.addEventListener('input', save_callback); // A hack so that it saves correctly, HOPEFULLY isn't too slow
}

enum MdState 
{
    Viewing,
    Editing,
}

let current_state = MdState.Editing;

async function init_editor_toggle(note_id: string)
{
    const textarea = document.getElementById(TEXT_EDITOR_NAME);
    const render_target = document.getElementById('editor-view');
    const view_note_image = document.getElementById('view-note-img');
    const edit_note_image = document.getElementById('edit-note-img');
    const change_mode_button = document.getElementById('toggle-editor-btn');

    if(!(textarea instanceof HTMLTextAreaElement) || !render_target || !edit_note_image || !view_note_image || !change_mode_button) return;

    set_md_state(current_state, textarea, render_target, edit_note_image, view_note_image);
    
    let note_text = (await notes.get_note(note_id)).text;
    textarea.value = note_text;

    change_mode_button.addEventListener('click', e => {
        let next_state = swap_state(current_state);
        set_md_state(next_state, textarea, render_target, edit_note_image, view_note_image);
    });
}

function swap_state(state: MdState): MdState
{
    if(state == MdState.Editing)
    {
        return MdState.Viewing;
    }
    else if(state === MdState.Viewing)
    {
        return MdState.Editing;
    }
    else 
    {
        throw "Unknown Markdown State"; 
    }
}

function set_md_state(state: MdState, textarea: HTMLTextAreaElement, render_target: HTMLElement, edit_note_image: HTMLElement, view_note_image: HTMLElement)
{
    current_state = state;
    if(state === MdState.Editing)
    {
        utils.show(textarea);
        utils.show(view_note_image);
        render_target.replaceChildren();
        utils.hide(render_target);
        utils.hide(edit_note_image);
    }
    if(state === MdState.Viewing)
    {
        utils.hide(textarea);
        utils.hide(view_note_image);
        utils.show(render_target);
        utils.show(edit_note_image);

        let html = utils.render_markdown(textarea.value);
        render_target.innerHTML = html;
    }
}

async function render_reference_dropdown(on_text_require_rerender: () => void)
{
    let dropdown = document.getElementById('reference-dropdown');
    let editing_note = await notes.get_editing_note();
    if(!dropdown || editing_note === null) return;

    let references = await notes.get_note_references(await notes.get_note(editing_note));

    dropdown.replaceChildren();
    dropdown.appendElement('div', title => {
        title.classList.add('reference-dropdown-title');
        title.innerHTML = `${references[0][0]}: ${references[0][1]}`
    })
    dropdown.appendElement('div', content => {
        content.classList.add('reference-dropdown-content');

        content.appendElement('div', new_reference_button => {
            new_reference_button.classList.add('new-reference-btn');
            new_reference_button.appendElement('img', img => {
                img.src = '../images/light-plus.svg';
                img.alt = 'plus';
            });

            new_reference_button.addEventListener('click', e => {
                word_select.begin_editing_note(() => {
                    render_reference_dropdown(on_text_require_rerender);
                });
            })
        });

        references.forEach(([title, text], index) => {
            content.appendElement('div', link => {
                link.classList.add('reference-link');

                link.appendElement('div', text_node => {
                    text_node.classList.add('reference-text');
                    text_node.innerHTML = `${title}: ${text}`

                    if(references.length === 1)
                    {
                        text_node.style.width = '100%';
                    }
                })

                if(references.length === 1) return;

                link.appendElement('button', button => {
                    button.classList.add('image-btn');
                    button.appendElement('img', img => {
                        img.src = '../images/light-trash-can.svg';
                        img.alt = 'trash';
                    });

                    button.addEventListener('click', e => {
                        delete_reference(index, on_text_require_rerender);
                    });
                });
            });
        });
    });
}

async function delete_reference(index: number, on_text_require_rerender: () => void)
{
    confirm_popup.show_confirm_popup({
        message: 'Are you sure you want to delete this reference location?',
        on_confirm: async () => {
            let editing_id = await notes.get_editing_note();
            if(editing_id === null) return;
            let note = await notes.get_note(editing_id);
            note.locations.remove_at(index);
        
            notes.update_note(note.id, note.locations, note.text).then(_ => {
                on_text_require_rerender();
                render_reference_dropdown(on_text_require_rerender);
            });
        }
    });
}


enum PaneSideType 
{
    Right,
    Left,
}

const leftPane = document.getElementById('left-pane') as HTMLElement;
const rightPane = document.getElementById('right-pane')  as HTMLElement;
const resizer = document.getElementById('resizer') as HTMLElement;
const collapseLeftBtn = document.getElementById('collapse-left') as HTMLElement;
const collapseRightBtn = document.getElementById('collapse-right') as HTMLElement;
const paneContainer = document.getElementById('pane-container') as HTMLElement;

function init_resizer()
{
    let isResizing = false;
    const collapseThreshold = 20;

    resizer.addEventListener('mousedown', _ => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        remove_transitions();
    });

    window.addEventListener('mousemove', e => {
        if (!isResizing) return;

        const containerWidth = paneContainer.offsetWidth;
        let leftWidth = e.clientX / containerWidth * 100;

        if (leftWidth < collapseThreshold) 
        {
            collapse_pane(PaneSideType.Left);
            hide_resizer();
        } 
        else if ((100 - leftWidth) < collapseThreshold) 
        {
            collapse_pane(PaneSideType.Right);
            hide_resizer();
        } 
        else 
        {
            leftPane.style.width = `${leftWidth}%`;
            leftPane.style.padding = "10px";
            rightPane.style.width = `${100 - leftWidth}%`;
            rightPane.style.padding = "10px";

            update_collapse_images(null);
            show_resizer();
        }
    });

    window.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
            apply_transitions();
        }
    });

    // Collapse/Expand logic for left pane
    collapseLeftBtn.addEventListener('click', () => {
        if (leftPane.style.width === '0%') 
        {
            leftPane.style.width = '50%';
            leftPane.style.padding = '10px';  // Restore padding
            rightPane.style.width = '50%';
            update_collapse_images(null);
            show_resizer();
        } 
        else 
        {
            collapse_pane(PaneSideType.Left);
            show_resizer();
            setTimeout(() => {
                hide_resizer();
            }, 300);
        }
    });

    // Collapse/Expand logic for right pane
    collapseRightBtn.addEventListener('click', () => {
        if (rightPane.style.width === '0%') 
        {
            rightPane.style.width = '50%';
            rightPane.style.padding = '10px';  // Restore padding
            leftPane.style.width = '50%';
            update_collapse_images(null);
            show_resizer();
        } 
        else 
        {
            collapse_pane(PaneSideType.Right);
            show_resizer();
            setTimeout(() => {
                hide_resizer();
            }, 300);
        }
    });
}

function remove_transitions() 
{
    leftPane.style.transition = 'none';
    rightPane.style.transition = 'none';
}

function apply_transitions() 
{
    leftPane.style.transition = 'width 0.3s ease-in-out';
    rightPane.style.transition = 'width 0.3s ease-in-out';
}

function collapse_pane(side: PaneSideType) 
{
    if (side === PaneSideType.Left) 
    {
        leftPane.style.width = '0%';
        leftPane.style.padding = '0';
        rightPane.style.width = '100%';
        rightPane.style.padding = '10px'
    } 
    else if (side === PaneSideType.Right) 
    {
        rightPane.style.width = '0%';
        rightPane.style.padding = '0';
        leftPane.style.width = '100%';
        leftPane.style.padding = '10px';
    }

    update_collapse_images(side);
}

function update_collapse_images(type: PaneSideType | null) {
    const right_min_img = document.getElementById('right-min-img');
    const right_max_img = document.getElementById('right-max-img');
    const left_min_img = document.getElementById('left-min-img');
    const left_max_img = document.getElementById('left-max-img');

    if(!right_min_img || !right_max_img || !left_min_img || !left_max_img) return;
    
    if(type === null)
    {
        right_min_img.classList.remove('hidden');
        right_max_img.classList.add('hidden');
        left_min_img.classList.remove('hidden');
        left_max_img.classList.add('hidden');
    }
    else if(type === PaneSideType.Left)
    {
        right_min_img.classList.remove('hidden');
        right_max_img.classList.add('hidden');
        left_min_img.classList.add('hidden');
        left_max_img.classList.remove('hidden');
    }
    else if(type === PaneSideType.Right)
    {
        right_min_img.classList.add('hidden');
        right_max_img.classList.remove('hidden');
        left_min_img.classList.remove('hidden');
        left_max_img.classList.add('hidden');
    }
}

function hide_resizer()
{
    if(!resizer) return;
    resizer.style.display = 'none';
}

function show_resizer()
{
    if(!resizer) return;
    resizer.style.display = 'block';
}