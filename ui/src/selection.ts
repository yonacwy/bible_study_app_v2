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

async function get_used_highlights(): Promise<string[]>
{
    let ret: string[] = [];
    
    return selected_ranges.map(r => (async () => {
        let annotations = await highlights.get_chapter_annotations(r.chapter);
        for (let i = r.begin; i <= r.end; i++)
        {
            let wa = annotations[i];
            if(wa)
            {
                for(let j = 0; j < wa.highlights.length; j++)
                {
                    if (!ret.includes(wa.highlights[j]))
                    {
                        ret.push(wa.highlights[j]);
                    }
                }
            }
        }

        return;
    })()).flatten_promise().then(_ => {
        return ret;
    });
}

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
    if (popup.contains(e.target as HTMLElement) || popup === e.target) // if we clicked on the popup, do nothing
    {
        return;
    }
    
    let selection = window.getSelection();

    let selected_words: HTMLElement[] = [];
    if(selection !== null && utils.trim_string(selection.toString()).length > 0)
    {
        let all_words = document.querySelectorAll('.bible-word')
            .values()
            .map(v => v as HTMLElement)
            .toArray();

        let ranges = utils.ranges.range(0, selection.rangeCount).map(r => selection.getRangeAt(r)).toArray();

        selected_words = all_words.filter(wordEl => {
            const word_range = document.createRange();
            word_range.selectNodeContents(wordEl);

            // Check if the selection overlaps with the word's range
            return ranges.some(range => {
                return (
                    range.compareBoundaryPoints(Range.END_TO_START, word_range) < 0 &&
                    range.compareBoundaryPoints(Range.START_TO_END, word_range) > 0
                );
            });
        });
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

        show_popup(popup, e);
    }
    else 
    {
        hide_popup(popup);
        selected_ranges = [];
        return;
    }
    
    popup.replaceChildren();

    Promise.all([
        spawn_new_note_button(),
        spawn_editing_note_button(),
        spawn_highlight_dropdown(popup),
        spawn_erase_dropdown(popup)
    ]).then(c => c as (HTMLElement | null)[]).then(children => {
        for(let i = 0; i < children.length; i++)
        {
            let c = children[i];
            if (!c) return;
            
            popup.appendChild(c);
            if(c.classList.contains('small-dropdown'))
            {
                let content = c.querySelector('.small-dropdown-content') as HTMLElement;

                content.style.display = 'block';
                let rect = content.getBoundingClientRect();
                let window_height = document.documentElement.clientHeight;

                if (rect.bottom > window_height + 10)
                {
                    c.classList.add('reverse');
                    content.reverse_children();
                }

                content.style.display = '';
            }
        }
    });
}

function show_popup(popup: HTMLElement, e: MouseEvent) 
{
    popup.classList.remove('hidden');
    const SIZE_PADDING: number = 10;
    let window_size = {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
    }

    let popup_rect = popup.getBoundingClientRect();

    if(e.clientX + popup_rect.width + SIZE_PADDING > window_size.width)
    {
        popup.style.left = (window_size.width - popup_rect.width - SIZE_PADDING) + 'px';
    }
    else 
    {
        popup.style.left = e.clientX + SIZE_PADDING + 'px';
    }

    if(e.clientY + popup_rect.height + SIZE_PADDING > window_size.height)
    {
        popup.style.top = (window_size.height - popup_rect.height - SIZE_PADDING) + 'px';
    }
    else 
    {
        popup.style.top = e.clientY + SIZE_PADDING + 'px';
    }
}

function hide_popup(popup: HTMLElement)
{
    popup.classList.add('hidden');
}

async function spawn_selection_popup(): Promise<HTMLElement>
{
    let popup = utils.spawn_element('div', ['selection-popup', 'hidden'], _ => {});
    return popup;
}

async function spawn_erase_dropdown(popup: HTMLElement): Promise<HTMLElement | null>
{
    let all_cats = await highlights.get_categories();
    let categories = highlights.sort_highlights(await get_used_highlights().then(used => {
        return used.map(u => all_cats[u]);
    }));

    if (categories.length === 0)
    {
        return null;
    }

    return spawn_highlight_selector({
        image: utils.images.ERASER,
        tooltip: 'Erase highlights',
        color_options: categories,
        on_select: id => {
            popup.classList.add('hidden');
            erase_highlight(id);
        },
        on_clear: () => {
            popup.classList.add('hidden');
            clear_all_highlights()
        },
        select_type: 'erase'
    })
}

async function spawn_highlight_dropdown(popup: HTMLElement): Promise<HTMLElement>
{
    return spawn_highlight_selector({
        image: utils.images.HIGHLIGHTER,
        tooltip: 'Highlight',
        color_options: await highlights.get_sorted_categories(),
        on_select: id => {
            popup.classList.add('hidden');
            paint_highlight(id);
        },
        on_new: () => {
            popup.classList.add('hidden');
            utils.debug_print(`created new highlight`);
        },
        select_type: 'highlight',
    })
}

async function erase_highlight(id: string)
{
    let vs = selected_ranges.map(r => {
        return utils.ranges.range_inclusive(r.begin, r.end).map(i => {
            return highlights.erase_chapter_highlight(r.chapter, i, id);
        }).toArray();
    }).flat();

    Promise.all(vs).then(_ => {
        ON_SELECTION_EVENT.invoke('erased');
    });
}

async function clear_all_highlights(): Promise<void>
{
    return (await Promise.all(await highlights.get_sorted_categories().then(cats => cats.map(c => c.id)))).map(id => {
        return erase_highlight(id);
    }).flatten_promise().then(() => {

        ON_SELECTION_EVENT.invoke('erased');
    });
}

async function paint_highlight(id: string)
{
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

function spawn_highlight_selector(args: {
    tooltip: string,
    image: string,
    color_options: { color: Color, name: string, id: string }[],
    on_new?: () => void,
    on_clear?: () => void,
    on_select: (id: string) => void,
    select_type: 'highlight' | 'erase',
}): HTMLElement
{
    let dropdown = utils.spawn_element('div', ['small-dropdown'], _ => {});
    
    let title_button = utils.spawn_image_button(args.image, (e, img) => {
        img.button.classList.toggle('active');
        dropdown.classList.toggle('active');
    });

    let option_nodes = args.color_options.map(o => utils.spawn_element('div', [], div => {
        div.append_element_ex('div', ['color-square'], square => {
            square.style.backgroundColor = utils.color_to_hex(o.color);

            if (args.select_type === 'erase')
            {
                square.append_element_ex('img', [], i => i.src = utils.images.DO_NOT_ENTER);
            }
        });

        if (args.select_type === 'highlight')
        {
            div.title = `Select highlight ${o.name}`;
        }
        
        if (args.select_type === 'erase')
        {
            div.title = `Erase highlight ${o.name}`;
        }

        div.addEventListener('click', e => {
            title_button.button.classList.remove('active');
            dropdown.classList.remove('active');
            args.on_select(o.id);
        });
    })) as HTMLElement[];

    if (args.on_new)
    {
        let new_btn = utils.spawn_image_button(utils.images.PLUS, e => {
            title_button.button.classList.remove('active');
            dropdown.classList.remove('active');
            if(args.on_new) args.on_new();
        });
        new_btn.button.title = 'Make new highlight';
        option_nodes.push(new_btn.button);
    }

    if (args.on_clear)
    {
        let clear_btn = utils.spawn_image_button(utils.images.CLEAR, e => {
            title_button.button.classList.remove('active');
            dropdown.classList.remove('active');
            if (args.on_clear) args.on_clear();
        });
        clear_btn.button.title = 'Clear all highlights';
        option_nodes.push(clear_btn.button);
    }

    title_button.button.title = args.tooltip;

    dropdown.appendChild(title_button.button);

    dropdown.append_element_ex('div', ['small-dropdown-content'], content => {
        option_nodes.forEach(n => content.appendChild(n));
    });
    
    return dropdown;
}
