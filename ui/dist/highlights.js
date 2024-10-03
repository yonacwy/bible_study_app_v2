import { get_chapter } from "./bible.js";
import * as utils from "./utils.js";
export function create_category(color, name, description, priority) {
    utils.invoke('add_highlight_category', {
        color: color,
        name: name,
        description: description ?? "",
        priority: priority
    });
    utils.debug_print(`${description}`);
}
export function set_category(id, color, name, description, priority) {
    utils.invoke('set_highlight_category', {
        id: id,
        color: color,
        name: name,
        description: description ?? "",
        priority: priority
    });
}
export async function get_catagories() {
    return JSON.parse(await utils.invoke('get_highlight_catagories', {}));
}
export function render_catagories(on_delete, on_edit) {
    utils.invoke('get_highlight_catagories', {}).then((catagories_json) => {
        let container = document.getElementById('highlights');
        if (container === null)
            return;
        let catagories = JSON.parse(catagories_json);
        if (catagories.length == 0) {
            let messageDiv = document.createElement('div');
            messageDiv.innerHTML = "No Highlights created";
            return;
        }
        for (let id in catagories) {
            let category = catagories[id];
            let name = category.name;
            let description = category.description;
            let color = category.color;
            let priority = category.priority;
            let highlightDiv = document.createElement('div');
            highlightDiv.className = 'highlight';
            let colorBar = document.createElement('div');
            colorBar.className = 'color-bar';
            colorBar.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
            let contentDiv = document.createElement('div');
            contentDiv.className = 'highlight-content';
            contentDiv.innerHTML = `
                <h2>${name}</h2>
                <p>${description}</p>
                <p><span>Priority:</span> ${priority}</p>
                <div class="same-line">
                    <button class="edit-btn" id="edit-btn-n${category.id}" title="Edit this highlight category">Edit</button>
                    <button class="delete-btn" id="delete-btn-n${category.id}" title="Delete this highlight category">Delete</button>
                </div>
            `;
            highlightDiv.appendChild(colorBar);
            highlightDiv.appendChild(contentDiv);
            container.appendChild(highlightDiv);
            utils.on_click(`delete-btn-n${category.id}`, e => {
                on_delete(category.id);
            });
            utils.on_click(`edit-btn-n${category.id}`, e => {
                on_edit(category.id);
            });
        }
        ;
    });
}
export async function get_chapter_annotations() {
    let chapter = await get_chapter();
    let annotations_json = await utils.invoke('get_chapter_annotations', { chapter: chapter });
    return JSON.parse(annotations_json);
}
export async function highlight_word(chapter, word_pos, highlight_id) {
    if (highlight_id !== null && highlight_id !== undefined) {
        utils.invoke('highlight_word', {
            chapter: chapter,
            wordPosition: word_pos,
            highlightId: highlight_id,
        });
    }
}
export async function highlight_chapter_word(word_pos, highlight_id) {
    let chapter = await get_chapter();
    if (highlight_id !== null && highlight_id !== undefined) {
        utils.invoke('highlight_word', {
            chapter: chapter,
            wordPosition: word_pos,
            highlightId: highlight_id,
        });
    }
}
export async function erase_highlight(chapter, word_index, highlight_id) {
    if (highlight_id !== null && highlight_id !== undefined) {
        utils.invoke('erase_highlight', {
            chapter: chapter,
            wordPosition: word_index,
            highlightId: highlight_id,
        });
    }
}
export async function erase_chapter_highlight(word_pos, highlight_id) {
    let chapter = await get_chapter();
    if (highlight_id !== null && highlight_id !== undefined) {
        utils.invoke('erase_highlight', {
            chapter: chapter,
            wordPosition: word_pos,
            highlightId: highlight_id,
        });
    }
}
const SELECTED_HIGHLIGHT_KEY = 'selected-highlight-id';
export function set_selected_highlight(id) {
    if (id === null) {
        window.sessionStorage.removeItem(SELECTED_HIGHLIGHT_KEY);
    }
    else {
        window.sessionStorage.setItem(SELECTED_HIGHLIGHT_KEY, id);
    }
}
export function get_selected_highlight() {
    return window.sessionStorage.getItem(SELECTED_HIGHLIGHT_KEY);
}
