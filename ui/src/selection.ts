import * as utils from "./utils/index.js";
import * as bible from "./bible.js";
import * as notes from "./notes.js";
import { ChapterIndex, Color } from "./bindings.js";
import * as view_states from "./view_states.js";
import * as highlights from "./highlights.js";

export async function init_selection()
{
    let popup = await spawn_selection_popup();
    document.body.appendChild(popup);
    document.addEventListener('mouseup', e => on_selection_stopped(e, popup));
}

export type SelectionEventType = 'edited-note' | 'highlighted' | 'erased';
export const ON_SELECTION_EVENT = new utils.events.EventHandler<SelectionEventType>();

type WordRange = {
    parent: HTMLElement,
    words: HTMLElement[],
    chapter: ChapterIndex,
    word_offset: number,
}

let ranges: WordRange[] = [];

function get_ranges_info(w: HTMLElement): [ChapterIndex, number, HTMLElement] | null
{
    for(let i = 0; i < ranges.length; i++)
    {
        let range = ranges[i];
        for(let j = 0; j < range.words.length; j++)
        {
            if(w === range.words[j])
            {
                return [range.chapter, range.word_offset + j, range.parent];
            }
        }
    }

    return null;
}

export function clear_selection_ranges()
{
    ranges = [];
}

export function push_selection_range(content: HTMLElement, chapter: ChapterIndex, word_offset: number)
{
    let word_nodes = content.getElementsByClassName('bible-word');

    ranges.push({
        words: [...word_nodes] as HTMLElement[],
        chapter: chapter,
        word_offset: word_offset,
        parent: content,
    });
}

type SelectedWordRange = {
    chapter: ChapterIndex,
    begin: number,
    end: number,
}

let selected_ranges: SelectedWordRange[] = [];

function on_selection_stopped(e: MouseEvent, popup: HTMLElement)
{
    popup.style.left = e.clientX + 10 + 'px';
    popup.style.top = e.clientY + 10 + 'px';
    
    let selection = window.getSelection();

    let selected_words: HTMLElement[] = [];
    if(selection !== null && utils.trim_string(selection.toString()).length > 0)
    {
        let all_words = document.querySelectorAll('.bible-word')
            .values()
            .map(v => v as HTMLElement)
            .toArray();

        let ranges = utils.ranges.range(0, selection.rangeCount).map(r => selection.getRangeAt(r)).toArray();
        

        selected_words = all_words.filter(w => {
            for(let i = 0; i < ranges.length; i++)
            {
                if(ranges[i].intersectsNode(w))
                {
                    return true;
                }
            }

            return false;
        })
    }
    
    selected_ranges = [];

    if(selected_words.length > 0)
    {
        let parent_old: HTMLElement | null = null;
        selected_words.forEach(w => {
            let info = get_ranges_info(w);
            if(!info) return;

            let [chapter, word, parent] = info;
            if(parent_old !== parent)
            {
                selected_ranges.push({
                    chapter,
                    begin: word,
                    end: word,
                });

                parent_old = parent;
            }
            else 
            {
                selected_ranges[selected_ranges.length - 1].end = word;
            }
        });

        popup.classList.remove('hidden');
    }
    else 
    {
        popup.classList.add('hidden');
    }
}

async function spawn_selection_popup(): Promise<HTMLElement>
{
    let popup = utils.spawn_element('div', ['selection-popup', 'hidden'], _ => {});

    let create_button = spawn_new_note_button();
    let edit_button = await spawn_editing_note_button();
    let highlight_dropdown = await spawn_highlight_dropdown(popup);
    let erase_dropdown = await spawn_erase_dropdown(popup);

    
    popup.appendChild(create_button);
    popup.appendChild(edit_button);
    popup.appendChild(highlight_dropdown);
    popup.appendChild(erase_dropdown);

    return popup;
}

async function spawn_erase_dropdown(popup: HTMLElement): Promise<HTMLElement>
{
    return spawn_highlight_selector(utils.images.ERASER, 'Erase a highlight', id => {
        erase_highlight(id, popup);
    })
}

async function spawn_highlight_dropdown(popup: HTMLElement): Promise<HTMLElement>
{
    return spawn_highlight_selector(utils.images.HIGHLIGHTER, 'Select a highlight', id => {
        paint_highlight(id, popup);
    });
}

async function spawn_highlight_selector(image: string, tooltip: string, on_select: (id: string) => void): Promise<HTMLElement>
{
    let categories = await highlights.get_categories();
    let options = Object.entries(categories).map(v => {
        return {
            id: v[0],
            name: v[1].name,
            color: v[1].color,
        }
    });

    let option_nodes = options.map(o => utils.spawn_element('div', ['dropdown-option'], div => {
        div.appendElement('span', s => s.innerHTML = o.name);
        div.appendElementEx('div', ['color-square'], square => {
            square.style.backgroundColor = utils.color_to_hex(o.color);
        });

        div.addEventListener('click', _ => on_select(o.id));
    }));

    let dropdown = utils.spawn_element('div', ['dropdown'], dropdown => {
        let btn = utils.spawn_image_button(image);
        btn.button.title = tooltip;
        dropdown.appendChild(btn.button);

        let content = utils.spawn_element('div', ['dropdown-content'], content => {
            if(option_nodes.length > 0)
            {
                content.append(...option_nodes);
            }
            else 
            {
                let no_select = utils.spawn_element('div', ['dropdown-option'], div => {
                    div.innerHTML = 'No highlight created, click here to create a new highlight';
                });

                no_select.addEventListener('click', _ => {
                    window.location.href = utils.encode_to_url('highlight_editor.html', { old_path: window.location.href });
                })

                content.appendChild(no_select);
            }
        });

        dropdown.appendChild(content);
    });

    return dropdown;
}

async function erase_highlight(id: string, popup: HTMLElement)
{
    popup.classList.add('hidden');

    let vs = selected_ranges.map(r => {
        return utils.ranges.range_inclusive(r.begin, r.end).map(i => {
            return highlights.erase_chapter_highlight(r.chapter, i, id);
        }).toArray();
    }).flat();

    Promise.all(vs).then(_ => {
        ON_SELECTION_EVENT.invoke('erased');
    });
    
}

async function paint_highlight(id: string, popup: HTMLElement)
{
    popup.classList.add('hidden');

    let vs = selected_ranges.map(r => {
        return utils.ranges.range_inclusive(r.begin, r.end).map(i => {
            return highlights.highlight_chapter_word(r.chapter, i, id);
        }).toArray();
    }).flat();

    Promise.all(vs).then(_ => {
        ON_SELECTION_EVENT.invoke('highlighted');
    });
    
}

async function spawn_editing_note_button()
{
    let button = utils.spawn_image_button(utils.images.MESSAGE_PLUS, async _ => 
    {
        let editing_note_id = await notes.get_editing_note();
        if(selected_ranges.length <= 0 || editing_note_id === null) return;

        let selected_range = selected_ranges[0];

        let view = await bible.get_chapter_view(selected_range.chapter);
        let [verse_start, word_start] = bible.expand_word_index(view, selected_range.begin);
        let [verse_end, word_end] = bible.expand_word_index(view, selected_range.end);
    
        let verse_range = {
            verse_start: verse_start,
            verse_end: verse_end,
            word_start: word_start,
            word_end: word_end,
        };

        let editing_note = await notes.get_note(editing_note_id);
        editing_note.locations.push({
            chapter: selected_range.chapter,
            range: verse_range,
        })
    
        notes.update_note(editing_note_id, editing_note.locations, editing_note.text, editing_note.source_type).then(_ => {
            ON_SELECTION_EVENT.invoke('edited-note');
        });
    });

    if(!await notes.get_editing_note())
    {
        button.button.classList.add('hidden');
    }

    button.button.title = 'Add note reference';
    return button.button;
}

function spawn_new_note_button(): HTMLElement
{
    let button = utils.spawn_image_button(utils.images.NOTE_PLUS, async _ => 
    {
        if(selected_ranges.length <= 0) return;
        let selected_range = selected_ranges[0];

        let view = await bible.get_chapter_view(selected_range.chapter);
        let [verse_start, word_start] = bible.expand_word_index(view, selected_range.begin);
        let [verse_end, word_end] = bible.expand_word_index(view, selected_range.end);
    
        let verse_range = {
            verse_start: verse_start,
            verse_end: verse_end,
            word_start: word_start,
            word_end: word_end,
        };
    
        notes.create_note({
            chapter: selected_range.chapter,
            range: verse_range,
        }).then(r => {
            if (r !== null) // if created a new note, set it as the currently editing note
            {
                notes.set_editing_note(r).then(_ => {
                    view_states.goto_current_view_state();
                });
            }
        });
    });

    button.button.title = 'Create new note';
    return button.button;
}