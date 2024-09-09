import { debug_print, clamp } from "./utils.js";

export function init_popup_panel(id)
{
    let panel = document.getElementById(id);
    let resizer = panel.getElementsByClassName('resizer')[0];

    resizer.addEventListener('mousedown', e => {
        init_resize(e, panel);
    })
}

export function toggle_panel(id) 
{
    const panel = document.getElementById(id);
    panel.classList.toggle('open');
}

let is_resizing = false;
let resizing_panel = null;

function init_resize(e, panel) 
{
    is_resizing = true;
    resizing_panel = panel;
    document.addEventListener('mousemove', resize_panel);
    document.addEventListener('mouseup', stop_resize);
    e.preventDefault();
}

function resize_panel(e) 
{
    if (is_resizing) 
    {
        const newWidth = window.innerWidth - e.clientX;
        resizing_panel.style.width = clamp(200, 500, newWidth) + 'px';
    }
}

function stop_resize() 
{
    is_resizing = false;
    document.removeEventListener('mousemove', resize_panel);
    document.removeEventListener('mouseup', stop_resize);
    resizing_panel = null;
}