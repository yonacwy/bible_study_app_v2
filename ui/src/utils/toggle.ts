import { ImageButton, spawn_image_button } from "./button.js";
import { EventHandler } from "./events.js";
import { ValueStorage } from "./storage.js";

export function init_toggle(id: string, save_name: ValueStorage<boolean>)
{
    let toggle = document.getElementById(id);
    if (toggle === null) return null;
    set_toggle_opacity(save_name.get() ?? false);

    save_name.add_listener(v => {
        set_toggle_opacity(v ?? false);
    })

    toggle.addEventListener('click', _ => {
        let value = save_name.get() ?? false;
        let new_value = !value;
        save_name.set(new_value);
        set_toggle_opacity(new_value);
    });
    
    function set_toggle_opacity(value: boolean)
    {
        if(toggle === null) return;
        if(value)
        {
            toggle.style.opacity = 1.0.toString();
        }
        else 
        {
            toggle.style.opacity = 0.3.toString();
        }
    }
}

export type ToggleArgs = {
    image: string,
    is_toggled?: boolean,
    tooltip?: string,
    id?: string,
}

export type Toggle = {
    button: ImageButton,
    on_click: EventHandler<boolean>,
    get_value: () => boolean,
    set_value: (v: boolean) => void,
}

export function spawn_toggle_button(args: ToggleArgs): Toggle
{
    let handler = new EventHandler<boolean>();
    let value = args.is_toggled ?? false;
    let button = spawn_image_button(args.image, (e, b) => {
        value = !value;
        
        if(value)
        {
            b.button.classList.add('active');
        }
        else 
        {
            b.button.classList.remove('active');
        }
        
        handler.invoke(value);
    });

    if(args.id !== undefined)
    {
        button.button.id = args.id;
    }

    if(args.tooltip !== undefined)
    {
        button.button.title = args.tooltip;
    }

    if(value)
    {
        button.button.classList.add('active');
    }

    let get_value = () => {
        return value;
    }

    let set_value = (v: boolean) => {
        value = v;
        
        if(value)
        {
            button.button.classList.add('active');
        }
        else 
        {
            button.button.classList.remove('active');
        }
        
        handler.invoke(value);
    }

    return {
        button,
        on_click: handler,
        get_value,
        set_value,
    }
}