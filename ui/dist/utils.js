export const invoke = window.__TAURI__.invoke;
export function debug_print(msg) {
    invoke('debug_print', { message: msg });
}
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
export function is_alpha_numeric(str) {
    const REGEX = /^[a-zA-Z0-9 ]+$/;
    return REGEX.test(str);
}
export function is_valid_title(str) {
    const REGEX = /^[a-zA-Z0-9 \'\"\?\!\:\;\,\.\+\-]+$/;
    return REGEX.test(str);
}
export function clamp(min, max, value) {
    return Math.max(min, Math.min(max, value));
}
export function color_to_hex(color) {
    const { r, g, b } = color;
    // Ensure r, g, and b are within the range of 0-255
    const clamp = (value) => Math.max(0, Math.min(255, value));
    // Convert each color component to a two-digit hexadecimal value
    const toHex = (value) => clamp(value).toString(16).padStart(2, '0');
    // Combine the hex values into a single string
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
export function inverse_color(color) {
    const { r, g, b } = color;
    let ir = 255 - r;
    let ig = 255 - g;
    let ib = 255 - b;
    return { r: ir, g: ig, b: ib };
}
export function init_toggle(id, save_name, on_changed) {
    let toggle = document.getElementById(id);
    if (toggle === null)
        return null;
    let initial_value = get_toggle_value(save_name);
    set_toggle_opacity(initial_value);
    toggle.addEventListener('click', _ => {
        let value = get_toggle_value(save_name);
        let new_value = !value;
        sessionStorage.setItem(save_name, JSON.stringify(new_value));
        set_toggle_opacity(new_value);
        on_changed(new_value);
    });
    function set_toggle_opacity(value) {
        if (toggle === null)
            return;
        if (value) {
            toggle.style.opacity = 1.0.toString();
        }
        else {
            toggle.style.opacity = 0.3.toString();
        }
    }
}
export function get_toggle_value(save_name) {
    return JSON.parse(sessionStorage.getItem(save_name) ?? "false");
}
export function trim_string(str) {
    str = str.trim();
    return str.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '');
}
export function overlap(a, b) {
    return a.filter(i => b.includes(i));
}
export function reset_scroll() {
    window.scrollTo(0, 0);
}
export function set_opacity(id, opacity) {
    let element = document.getElementById(id);
    if (element instanceof HTMLElement) {
        element.style.opacity = opacity;
    }
}
let copy_event_listener = null;
export function init_format_copy_event_listener() {
    if (copy_event_listener !== null) {
        document.removeEventListener('copy', copy_event_listener);
    }
    let listener = (event) => {
        let selection = window.getSelection();
        if (selection === null)
            return;
        let selectedText = selection.toString();
        selectedText = selectedText.replace(/\u00A0/g, ' '); // Replace non-breaking spaces
        event.clipboardData.setData('text/plain', selectedText);
        event.preventDefault(); // Prevent the default copy action
    };
    document.addEventListener('copy', listener);
    copy_event_listener = listener;
}
export function capitalize_first_char(str) {
    if (!str)
        return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}
export function encode_64(data) {
    const json = JSON.stringify(data);
    return btoa(json);
}
export function decode_64(data) {
    const json = atob(data);
    return JSON.parse(json);
}
const DATA_PARAM_NAME = 'data';
export function encode_to_url(base, data) {
    const encoded = encode_64(data);
    return `${base}?${DATA_PARAM_NAME}=${encoded}`;
}
export function decode_from_url(url) {
    let search = new URLSearchParams(new URL(url).search);
    let data = search.get(DATA_PARAM_NAME);
    if (data === null) {
        return null;
    }
    else {
        return decode_64(data);
    }
}
Element.prototype.appendElement = function (key, builder) {
    let child = document.createElement(key);
    if (builder !== undefined) {
        builder(child);
    }
    this.appendChild(child);
    return this;
};
