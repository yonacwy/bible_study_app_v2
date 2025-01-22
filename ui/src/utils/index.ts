import { Marked } from "../md/marked.js";
export * from "./extensions.js";
export * from "./string_utils.js";
export * from "./color_utils.js";
export * from "./encoding.js";
export * from "./toggle.js";
export * from "./node_management.js";
export * as storage from "./storage.js";
export * from "./button.js";
export * from "./slider.js";

export const invoke: (fn_name: string, args: any) => Promise<any> = (window as any).__TAURI__.core.invoke;

export const emit_event: (event_name: string, data: any) => Promise<void> = (window as any).__TAURI__.event.emit;

export type UnlistenFn = () => void;
export type EventCallback = (value: any) => void;
export const listen_event: (event_name: string, handler: EventCallback) => Promise<UnlistenFn> = (window as any).__TAURI__.event.listen;

export type AsyncableFn = (() => void) | (() => Promise<void>);

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

export async function is_app_initialized(): Promise<boolean>
{
    return await invoke('is_initialized', {});
}

export function reset_scroll()
{
    window.scrollTo(0, 0);
}

export function conserve_scroll(update: AsyncableFn, id?: string)
{
    let scrollable: Element | Window = window;
    let scroll = { x: window.scrollX, y: window.scrollY };

    if(id !== undefined)
    {
        let e = document.getElementById(id);
        if(e !== null)
        {
            scrollable = e;
            scroll = { x: e.scrollLeft, y: e.scrollTop }
        }
    }

    let r = update();
    if(r instanceof Promise)
    {
        r.then(() => {
            scrollable.scrollTo(scroll.x, scroll.y);
        })
    }
    else 
    {
        scrollable.scrollTo(scroll.x, scroll.y);
    }
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

export async function display_migration_popup()
{
    let should_display = await invoke('should_display_migration', {});
    if (should_display)
    {
        alert('Your save has been migrated to the latest version.');
    }
}

export async function display_no_save_popup()
{
    let should_display = await invoke('should_display_no_save', {});
    if (should_display)
    {
        alert('No save found, creating a new save');
    }
}

export enum AudioClip
{
    Flip = 'flip',
}

export function play_audio(clip: AudioClip)
{
    invoke('play_clip', { clip_name: clip as string });
}

export function map_keys<T, R>(obj: T, f: (k: keyof T, o: T) => R): R[]
{
    let array: R[] = [];
    for(let key in obj)
    {
        array.push(f(key, obj))
    }

    return array;
}

export function open_file_explorer(path: string)
{
    invoke('open_file_explorer', { path: path });
}

export function open_save_in_file_explorer()
{
    invoke('open_save_in_file_explorer', {}).then(e => {
        let error = e as string | null;
        if(error !== null)
        {
            alert('No save file has been created');
        }
    })
}
