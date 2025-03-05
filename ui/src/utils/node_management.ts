import { debug_print } from "./index.js";

export function hide(node: HTMLElement)
{
    node.classList.add('hidden');
}

export function show(node: HTMLElement)
{
    node.classList.remove('hidden');
}

export function set_display(id: string, display: string)
{
    let element = document.getElementById(id);
    if(element !== null)
    {
        element.style.display = display;
    }
}

export function on_click(id: string, f:(e: Event) => void)
{
    let element = document.getElementById(id);
    if(element === null)
    {
        debug_print(`could not find element ${id}`);
    }
    element?.addEventListener('click', (e) => {
        f(e)
    });
}

export function read_value(id: string): string | undefined
{
    let element = document.getElementById(id);
    if(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)
    {
        return element.value;
    }
    else 
    {
        return undefined
    }
}

export function set_value(id: string, value: string)
{
    let element = document.getElementById(id);
    if(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)
    {
        element.value = value;
    }
}

export function set_html(id: string, html: string)
{
    let element = document.getElementById(id);
    if (element instanceof Element)
    {
        element.innerHTML = html;
    }
}

export function set_opacity(id: string, opacity: string)
{
    let element = document.getElementById(id);
    if(element instanceof HTMLElement)
    {
        element.style.opacity = opacity;
    }
}

export function add_class(id: string, c: string)
{
    let element = document.getElementById(id);
    if(element instanceof HTMLElement)
    {
        element.classList.add(c);
    }
}

export function remove_class(id: string, c: string)
{
    let element = document.getElementById(id);
    if(element instanceof HTMLElement)
    {
        element.classList.remove(c);
    }
}

export function contains_class(id: string, c: string): boolean
{
    let element = document.getElementById(id);
    if(element instanceof HTMLElement)
    {
        return element.classList.contains(c);
    }

    return false;
}

export function set_disabled(id: string, disabled: boolean)
{
    let element = document.getElementById(id);
    if(element instanceof HTMLInputElement)
    {
        element.disabled = disabled;
    }
}