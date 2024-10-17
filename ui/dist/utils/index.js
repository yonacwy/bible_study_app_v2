export * from "./extensions.js";
export * from "./string_utils.js";
export * from "./color_utils.js";
export * from "./encoding.js";
export * from "./toggle.js";
export * from "./node_management.js";
export const invoke = window.__TAURI__.invoke;
export function debug_print(msg) {
    invoke('debug_print', { message: msg });
}
export function overlap(a, b) {
    return a.filter(i => b.includes(i));
}
export function reset_scroll() {
    window.scrollTo(0, 0);
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
