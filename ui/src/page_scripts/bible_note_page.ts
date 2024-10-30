import { BibleSection, ChapterIndex } from "../bindings.js";
import * as utils from "../utils/index.js";
import * as pages from "./pages.js";
import * as bible_page from "./bible_page.js";

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
        bible_page.display_chapter(chapter, data.section.verse_range)
    ]).then(_ => {
        document.body.style.visibility = 'visible';
    });
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
    const collapseThreshold = 20;  // If the pane is smaller than 10%, it will collapse

    // Handle mousedown event on the resizer
    resizer.addEventListener('mousedown', _ => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';  // Prevent text selection during resize
        remove_transitions();  // Remove transitions while resizing
    });

    // Handle mousemove events on the window to capture even when pointer is outside resizer
    window.addEventListener('mousemove', e => {
        if (!isResizing) return;

        const containerWidth = paneContainer.offsetWidth;
        let leftWidth = e.clientX / containerWidth * 100;

        // Collapse left pane if it's too small
        if (leftWidth < collapseThreshold) 
        {
            collapse_pane(PaneSideType.Left);
            hide_resizer();
        } 
        // Collapse right pane if right side is too small
        else if ((100 - leftWidth) < collapseThreshold) 
        {
            collapse_pane(PaneSideType.Right);
            hide_resizer();
        } 
        else 
        {
            // Normal resize behavior when within range
            leftPane.style.width = `${leftWidth}%`;
            rightPane.style.width = `${100 - leftWidth}%`;
            update_collapse_images(null);
            show_resizer();
        }
    });

    // Handle mouseup to stop resizing
    window.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';  // Restore text selection
            apply_transitions();  // Reapply transitions after resizing

        }
    });

    // Remove transitions when resizing
    function remove_transitions() 
    {
        leftPane.style.transition = 'none';
        rightPane.style.transition = 'none';
    }

    // Reapply transitions after resizing
    function apply_transitions() 
    {
        leftPane.style.transition = 'width 0.3s ease-in-out';
        rightPane.style.transition = 'width 0.3s ease-in-out';
    }

    // Function to collapse a pane
    function collapse_pane(side: PaneSideType) 
    {
        if (side === PaneSideType.Left) 
        {
            leftPane.style.width = '0%';
            leftPane.style.padding = '0';  // Remove padding for full collapse
            rightPane.style.width = '100%';
        } 
        else if (side === PaneSideType.Right) 
        {
            rightPane.style.width = '0%';
            rightPane.style.padding = '0';  // Remove padding for full collapse
            leftPane.style.width = '100%';
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