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
export * as scrolling from "./scrolling.js";
export * as ranges from "./ranges.js";
export * as tts from "./tts.js";
export * as events from "./events.js";
export * as images from "./images.js";
export * from "./dropdown.js";

export const invoke: (fn_name: string, args: any) => Promise<any> = (window as any).__TAURI__.core.invoke;

export const emit_event: (event_name: string, data: any) => Promise<void> = (window as any).__TAURI__.event.emit;

export type AppEvent<T> = {
    event: string,
    payload: T,
    id: number,
}

export type UnlistenFn = () => void;
export type EventCallback<T> = (value: AppEvent<T>) => void;
export async function listen_event<T>(event_name: string, handler: EventCallback<T>): Promise<UnlistenFn>
{
    return (window as any).__TAURI__.event.listen(event_name, handler);
}

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

export function spawn_element<K extends keyof HTMLElementTagNameMap>(key: K, classes: string[], builder: (e: HTMLElementTagNameMap[K]) => void): HTMLElementTagNameMap[K]
{
    let element = document.createElement(key);
    element.classList.add(...classes);
    builder(element);
    return element;
}

export type SliderArgs = {
    min?: number,
    max?: number,
    step?: number,
    default?: number,
    on_input?: (v: number) => void, 
    on_change?: (v: number) => void,
    classes?: string[],
}

export function spawn_slider(args: SliderArgs): HTMLInputElement
{
    let min = (args.min ?? 0).toString();
    let max = (args.max ?? 1).toString();
    let value = (args.default ?? 0.5).toString();
    let step = (args.step ?? 0.001).toString();

    let input = spawn_element('input', args.classes ?? [], slider => {
        slider.type = 'range';

        slider.style.setProperty('--min', min);
        slider.style.setProperty('--max', max);

        slider.min = min;
        slider.max = max;
        slider.step = step;

        if(args.on_input !== undefined)
        {
            slider.addEventListener('input', _ => {
                (args.on_input as (v: number) => void)(+slider.value);
            })
        }

        if(args.on_change !== undefined)
        {
            slider.addEventListener('change', _ => {
                (args.on_change as (v: number) => void)(+slider.value);
            })
        }
    });

    input.value = value; // doesn't work if we put it in the `spawn_element` block for some reason.
    return input;
}


export function get_month_length(month: number, is_leap_year: boolean): number
{
    switch(month)
    {
        case 0: return 31; // Jan
        case 1: return is_leap_year ? 29 : 28; // Feb
        case 2: return 31; // Mar
        case 3: return 30; // Apr
        case 4: return 31; // May
        case 5: return 30; // Jun
        case 6: return 31; // Jul
        case 7: return 31; // August
        case 8: return 30; // Sept
        case 9: return 31; // Oct
        case 10: return 30; // Nov
        case 11: return 31; // Dec
    }

    return 0;
}

export function sleep(ms: number): Promise<void>
{
    return new Promise(resolve => setTimeout(resolve, ms));
}
