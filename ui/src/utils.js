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

export function color_to_hex(color) 
{
    const { r, g, b } = color;

    // Ensure r, g, and b are within the range of 0-255
    const clamp = (value) => Math.max(0, Math.min(255, value));

    // Convert each color component to a two-digit hexadecimal value
    const toHex = (value) => clamp(value).toString(16).padStart(2, '0');

    // Combine the hex values into a single string
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function inverse_color(color)
{
    const { r, g, b } = color;
    let ir = 255 - r;
    let ig = 255 - g;
    let ib = 255 - b;
    return { r: ir, g: ig, b: ib };
}