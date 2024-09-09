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

export function clamp(min, max, value)
{
    return Math.max(min, Math.min(max, value));
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

export function init_toggle(id, save_name, on_changed)
{
    let toggle = document.getElementById(id);
    let initial_value = get_toggle_value(save_name);
    set_toggle_opacity(initial_value);

    toggle.addEventListener('click', _ => {
        let value = get_toggle_value(save_name);
        let new_value = !value;
        sessionStorage.setItem(save_name, JSON.stringify(new_value));
        set_toggle_opacity(new_value);
        on_changed(new_value);
    });
    
    function set_toggle_opacity(value)
    {
        if(value)
        {
            toggle.style.opacity = 1.0;
        }
        else 
        {
            toggle.style.opacity = 0.3;
        }
    }
}

export function get_toggle_value(save_name)
{
    return JSON.parse(sessionStorage.getItem(save_name) ?? "false");
}

export function trim_string(str)
{
    str = str.trim();
    return str.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '');
}