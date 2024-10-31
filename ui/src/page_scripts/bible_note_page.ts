import { BibleSection, ChapterIndex } from "../bindings.js";
import * as utils from "../utils/index.js";
import * as pages from "./pages.js";
import * as bible_page from "./bible_page.js";
import * as notes from "../notes.js";

export type BibleNotePageData = { note: string, section: BibleSection };

export function run()
{
    let data = utils.decode_from_url(window.location.href) as BibleNotePageData;
    utils.debug_print(JSON.stringify(data));
    utils.init_format_copy_event_listener();

    let chapter: ChapterIndex = {
        book: data.section.book,
        number: data.section.chapter
    };

    Promise.all([
        pages.init_header(),
        init_resizer(),
        bible_page.display_chapter(chapter, data.section.verse_range),
        init_editor_toggle(data.note),
    ]).then(_ => {
        document.body.style.visibility = 'visible';
    });
}

enum MdState 
{
    Viewing,
    Editing,
}

const TOGGLED_STORAGE = 'editor-toggle-storage';

async function init_editor_toggle(note_id: string)
{
    const textarea = document.getElementById('editor-text');
    const render_target = document.getElementById('editor-view');
    const view_note_image = document.getElementById('view-note-img');
    const edit_note_image = document.getElementById('edit-note-img');
    const change_mode_button = document.getElementById('toggle-editor-btn');

    if(!(textarea instanceof HTMLTextAreaElement) || !render_target || !edit_note_image || !view_note_image || !change_mode_button) return;

    let current_state = utils.storage.retreive_value<MdState>(TOGGLED_STORAGE) ?? MdState.Editing;
    set_md_state(current_state, textarea, render_target, edit_note_image, view_note_image);
    
    let note_text = (await notes.get_note(note_id)).text;
    textarea.value = note_text;

    change_mode_button.addEventListener('click', e => {
        let current_state = utils.storage.retreive_value<MdState>(TOGGLED_STORAGE) ?? MdState.Editing;
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
    utils.storage.store_value(TOGGLED_STORAGE, state);
    if(state === MdState.Editing)
    {
        textarea.classList.remove('hidden');
        view_note_image.classList.remove('hidden');
        render_target.replaceChildren();
        render_target.classList.add('hidden');
        edit_note_image.classList.add('hidden');
    }
    if(state === MdState.Viewing)
    {
        textarea.classList.add('hidden');
        view_note_image.classList.add('hidden');
        render_target.classList.remove('hidden');
        edit_note_image.classList.remove('hidden');

        let html = utils.render_markdown(textarea.value);
        render_target.innerHTML = html;
    }
}

enum PaneSideType 
{
    Right,
    Left,
}

function init_resizer()
{
    const leftPane = document.getElementById('left-pane') as HTMLElement;
    const rightPane = document.getElementById('right-pane')  as HTMLElement;
    const resizer = document.getElementById('resizer') as HTMLElement;
    const collapseLeftBtn = document.getElementById('collapse-left') as HTMLElement;
    const collapseRightBtn = document.getElementById('collapse-right') as HTMLElement;
    const paneContainer = document.getElementById('pane-container') as HTMLElement;

    if(!leftPane || !rightPane || !resizer || !collapseLeftBtn || !collapseRightBtn || !paneContainer) return;


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
    const resizer = document.getElementById('resizer') as HTMLElement;
    if(!resizer) return;
    resizer.style.display = 'none';
}

function show_resizer()
{
    const resizer = document.getElementById('resizer') as HTMLElement;
    if(!resizer) return;
    resizer.style.display = 'block';
}