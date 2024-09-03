export const invoke = window.__TAURI__.invoke

export function debug_print(msg)
{
    invoke('debug_print', {message: msg});
}

export function set_display(id, display)
{
    document.getElementById(id).style.display = display;
}

export function on_click(id, f)
{
    document.getElementById(id).addEventListener('click', (e) => {
        f(e)
    });
}

export function read_value(id)
{
    return document.getElementById(id).value;
}

export function set_value(id, value)
{
    document.getElementById(id).value = value;
}

export function set_html(id, html)
{
    return document.getElementById(id).innerHTML = html;
}

export function is_alpha_numeric(str)
{
    const REGEX = /^[a-zA-Z0-9 ]+$/;
    return REGEX.test(str);
}

export function stringify_color(color)
{
    return `rgb(${color.r}, ${color.g}, ${color.g})`;
}