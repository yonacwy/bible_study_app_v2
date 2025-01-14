import { get_chapter } from "./bible.js";
import { ChapterIndex, HighlightCategory } from "./bindings.js";
import * as utils from "./utils/index.js";

export function create_category(color: string, name: string, description: string, priority: string)
{
    utils.invoke('add_highlight_category', {
        color: color,
        name: name,
        description: description ?? "",
        priority: priority
    });
}

export function set_category(id: string, color: string, name: string, description: string, priority: number)
{
    utils.invoke('set_highlight_category', {
        id: id,
        color: color,
        name: name,
        description: description,
        priority: priority.toString()
    });
}

export async function get_categories(): Promise<any>
{
    return JSON.parse(await utils.invoke('get_highlight_categories', {}));
}

export function render_categories(on_delete: (id: string) => void, on_edit: (id: string) => void)
{
    utils.invoke('get_highlight_categories', {}).then((categories_json: string) => {
        let container = document.getElementById('highlights');
        if (container === null) return;
        let categories = JSON.parse(categories_json);

        if (categories.length == 0)
        {
            let messageDiv = document.createElement('div');
            messageDiv.innerHTML = "No Highlights created";
            return;
        }

        for(let id in categories)
        {
            let category: HighlightCategory = categories[id];
            let name = category.name;
            let description = category.description;
            let color = category.color;
            let priority = category.priority;

            container.appendElementEx('div', ['highlight'], highlight_div => {
                highlight_div.appendElementEx('div', ['color-bar'], color_bar => {
                    color_bar.style.backgroundColor = utils.color_to_hex(color);
                });

                highlight_div.appendElementEx('div', ['highlight-content'], content_div => {
                    content_div.appendElement('h2', header => header.innerHTML = name);
                    content_div.appendElementEx('div', ['highlight-description'], desc => desc.innerHTML = utils.render_markdown(description));
                    content_div.appendElement('p', p => {
                        p.innerHTML = `<span class="priority">Priority:</span> ${priority}`;
                    });

                    content_div.appendElementEx('div', ['highlight-button-container'], button_container => {
                        let edit_btn = utils.create_image_button(button_container, '../images/light-pencil.svg', e => {
                            on_edit(category.id);
                        });
                        edit_btn.title = 'Edit category';

                        let delete_btn = utils.create_image_button(button_container, '../images/light-trash-can.svg', e => {
                            on_delete(category.id);
                        });
                        delete_btn.title = 'Delete category';
                    })
                });
            });
        };
    });
}

const HIGHLIGHTS_DROPDOWN_SELECTION_ID: string = 'highlights-dropdown';

export async function create_highlight_selection() 
{
    let highlight_data = await get_categories();
    let container = document.getElementById(HIGHLIGHTS_DROPDOWN_SELECTION_ID);
    let current_highlight_id = SELECTED_HIGHLIGHT.get();

    if(container === null) return;
    container.replaceChildren();

    let highlight_categories: any[] = [];
    for(let id in highlight_data)
    {
        highlight_categories.push(highlight_data[id]);
    }

    highlight_categories = highlight_categories.sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
    })

    for(let i = 0; i < highlight_categories.length; i++)
    {
        let highlight = highlight_categories[i];

        let highlight_div = document.createElement('div');
        highlight_div.classList.add('dropdown-option');
        if(highlight.id === current_highlight_id)
        {
            highlight_div.classList.add('selected-option');
        }
        
        let span = document.createElement('span');
        span.innerHTML = highlight.name;
        highlight_div.appendChild(span);

        let color_div = document.createElement('div');
        color_div.style.backgroundColor = utils.color_to_hex(highlight.color);
        color_div.classList.add('color-square');
        highlight_div.appendChild(color_div);

        highlight_div.addEventListener('click', e => {
            let nodes = container.getElementsByClassName('dropdown-option');
            for (let i = 0; i < nodes.length; i++)
            {
                nodes[i].classList.remove('selected-option');
            }

            highlight_div.classList.add('selected-option');
            SELECTED_HIGHLIGHT.set(highlight.id);
        });

        container.appendChild(highlight_div);
    }

    let none_div = document.createElement('div');
    none_div.classList.add('dropdown-option');
    if(current_highlight_id === null)
    {
        none_div.classList.add('selected-option');
    }

    let span = document.createElement('span');
    span.innerHTML = 'None';
    none_div.appendChild(span);

    none_div.addEventListener('click', e => {
        let nodes = container.getElementsByClassName('dropdown-option');
        for (let i = 0; i < nodes.length; i++)
        {
            nodes[i].classList.remove('selected-option');
        }

        none_div.classList.add('selected-option');
        SELECTED_HIGHLIGHT.set(null);
    });

    container.appendChild(none_div);
    SELECTED_HIGHLIGHT.update_listeners();
}

export async function update_highlight_selection()
{
    let highlight_data = await get_categories();
    let container = document.getElementById(HIGHLIGHTS_DROPDOWN_SELECTION_ID);
    let current_highlight_id = SELECTED_HIGHLIGHT.get();

    if (!container) return;
    
    let nodes = container.getElementsByClassName('dropdown-option');

    let highlight_categories: string[] = [];
    for(let id in highlight_data)
    {
        highlight_categories.push(id);
    }

    for (let i = 0; i < nodes.length; i++)
    {
        nodes[i].classList.remove('selected-option');
        if (current_highlight_id === highlight_categories[i])
        {
            nodes[i].classList.add('selected-option');
        }

        if (current_highlight_id === null && i === nodes.length - 1)
        {
            nodes[i].classList.add('selected-option');
        }
    }
}

export async function get_chapter_annotations(chapter: ChapterIndex): Promise<any>
{
    let annotations_json = await utils.invoke('get_chapter_annotations', { chapter: chapter });
    return JSON.parse(annotations_json);
}

export async function highlight_word(chapter: any, word_pos: number, highlight_id: string) 
{
    if(highlight_id !== null && highlight_id !== undefined)
    {
        utils.invoke('highlight_word', {
            chapter: chapter,
            word_position: word_pos,
            highlight_id: highlight_id,
        });
    }
}

export async function highlight_chapter_word(chapter: ChapterIndex, word_pos: number, highlight_id: string) 
{
    if(highlight_id !== null && highlight_id !== undefined)
    {
        utils.invoke('highlight_word', {
            chapter: chapter,
            word_position: word_pos,
            highlight_id: highlight_id,
        });
    }
}

export async function erase_highlight(chapter: any, word_index: number, highlight_id: string) 
{
    if(highlight_id !== null && highlight_id !== undefined)
    {
        utils.invoke('erase_highlight', {
            chapter: chapter,
            word_position: word_index,
            highlight_id: highlight_id,
        });
    }
}

export async function erase_chapter_highlight(chapter: ChapterIndex, word_pos: number, highlight_id: string) 
{
    if(highlight_id !== null && highlight_id !== undefined)
    {
        utils.invoke('erase_highlight', {
            chapter: chapter,
            word_position: word_pos,
            highlight_id: highlight_id,
        });
    }
}

const SELECTED_HIGHLIGHT_KEY = 'selected-highlight-id';
export const SELECTED_HIGHLIGHT = new utils.storage.ValueStorage<string>(SELECTED_HIGHLIGHT_KEY);

const IS_ERASING_KEY = 'is-erasing-id';
export const ERASING_HIGHLIGHT = new utils.storage.ValueStorage<boolean>(IS_ERASING_KEY);