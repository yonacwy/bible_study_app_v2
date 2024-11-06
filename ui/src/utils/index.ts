import { Color } from "../bindings.js";
import { Marked } from "../md/marked.js";
export * from "./extensions.js";
export * from "./string_utils.js";
export * from "./color_utils.js";
export * from "./encoding.js";
export * from "./toggle.js";
export * from "./node_management.js";
export * as storage from "./storage.js";

export const invoke: (fn_name: string, args: any) => Promise<any> = (window as any).__TAURI__.core.invoke;

export const emit_event: (event_name: string, data: any) => Promise<void> = (window as any).__TAURI__.event.emit;

export type UnlistenFn = () => void;
export type EventCallback = (value: any) => void;
export const listen_event: (event_name: string, handler: EventCallback) => Promise<UnlistenFn> = (window as any).__TAURI__.event.listen;

export const LEFT_MOUSE_BUTTON = 0;
export const MIDDLE_MOUSE_BUTTON = 1;
export const RIGHT_MOUSE_BUTTON = 2;

export function debug_print(msg: string)
{
    invoke('debug_print', {message: msg});
}

export function debug_json(value: any)
{
    debug_print(JSON.stringify(value));
}

export function overlap<T>(a: T[], b: T[]): T[]
{
    return a.filter(i => b.includes(i))
}

export function reset_scroll()
{
    window.scrollTo(0, 0);
}

let copy_event_listener: ((e: any) => void) | null = null;
export function init_format_copy_event_listener()
{
    if(copy_event_listener !== null)
    {
        document.removeEventListener('copy', copy_event_listener);
    }

    let listener = (event: any) => {
        let selection = window.getSelection();
        if(selection === null) return;
        let selectedText = selection.toString();
        selectedText = selectedText.replace(/\u00A0/g, ' '); // Replace non-breaking spaces
        event.clipboardData.setData('text/plain', selectedText);
        event.preventDefault(); // Prevent the default copy action
    }

    document.addEventListener('copy', listener);
    copy_event_listener = listener;
}

export function render_markdown(markdown: string): string
{
    let rendered = Marked.parse(markdown);
    return rendered;
}
