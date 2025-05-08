import { get_chapter } from "./bible.js";
import { ChapterIndex, HighlightCategories, HighlightCategory } from "./bindings.js";
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

export async function get_categories(): Promise<HighlightCategories>
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

            container.append_element_ex('div', ['highlight'], highlight_div => {
                highlight_div.append_element_ex('div', ['color-bar'], color_bar => {
                    color_bar.style.backgroundColor = utils.color_to_hex(color);
                });

                highlight_div.append_element_ex('div', ['highlight-content'], content_div => {
                    content_div.append_element('h2', header => header.innerHTML = name);
                    content_div.append_element_ex('div', ['highlight-description'], desc => desc.innerHTML = utils.render_markdown(description));
                    content_div.append_element('p', p => {
                        p.innerHTML = `<span class="priority">Priority:</span> ${priority}`;
                    });

                    content_div.append_element_ex('div', ['highlight-button-container'], button_container => {
                        let edit_btn = utils.create_image_button(button_container, '../images/light-pencil.svg', e => {
                            on_edit(category.id);
                        });
                        edit_btn.button.title = 'Edit category';

                        let delete_btn = utils.create_image_button(button_container, '../images/light-trash-can.svg', e => {
                            on_delete(category.id);
                        });
                        delete_btn.button.title = 'Delete category';
                    })
                });
            });
        };
    });
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