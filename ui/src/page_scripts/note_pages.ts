import * as utils from "../utils/index.js";
import * as notes from "../notes.js";
import * as view_states from "../view_states.js";
import * as confirm_popup from "../popups/confirm_popup.js";
import * as bible from "../bible.js";
import { format_reference_id } from "../rendering/word_search.js";
import * as selection from "../selection.js";
import { TextEditor } from "../text_editor/index.js";

const DELETE_NOTE_BUTTON = 'delete-note-btn'

export async function init_note_page(note_id: string, on_text_require_rerender: () => void, on_search: (msg: string) => void): Promise<void>
{
    selection.ON_SELECTION_EVENT.add_listener(e => {
        if(e === 'edited-note')
        {
            render_note_references(on_text_require_rerender, on_search);
        }
    });

    Promise.all([
        init_resizer(),
        init_text_editor(note_id, on_search).then(_ => {
            init_note_references(on_text_require_rerender, on_search);
        }),
    ]);
}

async function init_text_editor(note_id: string, on_search: (msg: string) => void)
{
    let editor = new TextEditor({
        id: 'note-editor',
        parent: document.getElementById('right-pane'),
        has_misc_options: true,
        on_ref_clicked: (ref) => {
            on_search(ref)
        }
    });

    let note = await notes.get_note(note_id);
    editor.load_save({
        data_type: note.source_type,
        source: note.text,
    });

    async function save_note()
    {
        let current = await notes.get_editing_note();
        if(current === null) return;
    
        let locations = (await notes.get_note(current)).locations;
        let save = editor.get_save();
        notes.update_note(current, locations, save.source, save.data_type);
    }

    editor.on_save.add_listener(save_note);

    editor.on_close.add_listener(async () => {
        save_note().then(async _ => {
            apply_transitions();
            collapse_pane(PaneSideType.Right);
            await utils.sleep(500);
            notes.set_editing_note(null).then(_ => {
                view_states.goto_current_view_state();
            });
        });
    })

    editor.on_delete.add_listener(() => {
        confirm_popup.show_confirm_popup({
            message: 'Are you sure you want to delete this note?',
            on_confirm: delete_note
        });
    })

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

async function init_note_references(on_text_require_rerender: () => void, on_search: (msg: string) => void): Promise<void>
{
    let pane = document.getElementById('right-pane');
    if(!pane) return;

    let references_div = utils.spawn_element('div', ['note-references'], div => {
        div.id = 'note-references';
    });

    pane.appendChild(references_div);

    return render_note_references(on_text_require_rerender, on_search);
}

async function render_note_references(on_text_require_rerender: () => void, on_search: (msg: string) => void)
{
    let references_div = document.getElementById('note-references');
    let editing_note = await notes.get_editing_note();
    if(!references_div || editing_note === null) return;

    references_div.replaceChildren();

    let references = await notes.get_note_references(await notes.get_note(editing_note));

    references.forEach((r, index) => {
        let link = utils.spawn_element('div', ['note-reference'], link => {
            link.append_element('div', text_node => {
                text_node.classList.add('reference-text');
                text_node.innerHTML = `${r[0]}: ${r[1]}`;
            })
    
            if(references.length === 1) return;

            let delete_button = utils.spawn_image_button(utils.images.TRASH_CAN, e => {
                delete_reference(index, on_text_require_rerender, on_search);
            });
            link.appendChild(delete_button.button);
        });

        link.addEventListener('click', l => {
            on_search(r[0]);
        })

        references_div.appendChild(link);
    })
}

async function delete_reference(index: number, on_text_require_rerender: () => void, on_search: (msg: string) => void)
{
    confirm_popup.show_confirm_popup({
        message: 'Are you sure you want to delete this reference location?',
        on_confirm: async () => {
            let editing_id = await notes.get_editing_note();
            if(editing_id === null) return;
            let note = await notes.get_note(editing_id);
            note.locations.remove_at(index);
        
            notes.update_note(note.id, note.locations, note.text, 'json').then(_ => {
                on_text_require_rerender();
                render_note_references(on_text_require_rerender, on_search);
            });
        }
    });
}

export async function scroll_to_editing()
{
    let editing = notes.get_did_create_note();
    if(!editing) return;

    let view_state_type = await view_states.get_view_state_type();

    if (view_state_type == view_states.ViewStateType.Chapter)
    {
        let chapter = await bible.get_chapter();
        if(!chapter) return;

        let view = await bible.get_chapter_view(chapter);
        let word_index = bible.flatten_verse_index(view, editing.range.verse_start, editing.range.word_start);
        
        let words = leftPane.getElementsByClassName('bible-word');
        if(!words) return;
        words[word_index].scrollIntoView();
        leftPane.scrollBy(0, -40);
    }
    else if (view_state_type == view_states.ViewStateType.Search)
    {
        let ids = await Promise.all(utils.ranges.range_inclusive(editing.range.verse_start, editing.range.verse_end)
            .map(async v => format_reference_id(editing.chapter.book, editing.chapter.number, v))
            .toArray());

        let verse = ids.find_map(id => document.getElementById(id));
        if (verse !== undefined)
        {
            verse.scrollIntoView();
            leftPane.scrollBy(0, -40);
        }
    }
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
        } 
        else if ((100 - leftWidth) < collapseThreshold) 
        {
            collapse_pane(PaneSideType.Right);
        } 
        else 
        {
            leftPane.style.width = `${leftWidth}%`;
            leftPane.style.padding = "10px";
            rightPane.style.width = `${100 - leftWidth}%`;
            rightPane.style.padding = "10px";

            update_collapse_images(null);
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
        } 
        else 
        {
            collapse_pane(PaneSideType.Left);
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
        } 
        else 
        {
            collapse_pane(PaneSideType.Right);
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
    leftPane.style.transition = 'width 0.4s ease-in-out';
    rightPane.style.transition = 'width 0.4s ease-in-out';
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