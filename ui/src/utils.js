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