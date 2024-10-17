import { debug_print } from "./index.js";
export function set_display(id, display) {
    let element = document.getElementById(id);
    if (element !== null) {
        element.style.display = display;
    }
}
export function on_click(id, f) {
    let element = document.getElementById(id);
    if (element === null) {
        debug_print(`could not find element ${id}`);
    }
    element?.addEventListener('click', (e) => {
        f(e);
    });
}
export function read_value(id) {
    let element = document.getElementById(id);
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        return element.value;
    }
    else {
        return undefined;
    }
}
export function set_value(id, value) {
    let element = document.getElementById(id);
    HTMLTextAreaElement;
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.value = value;
    }
}
export function set_html(id, html) {
    let element = document.getElementById(id);
    if (element instanceof Element) {
        element.innerHTML = html;
    }
}
export function set_opacity(id, opacity) {
    let element = document.getElementById(id);
    if (element instanceof HTMLElement) {
        element.style.opacity = opacity;
    }
}
