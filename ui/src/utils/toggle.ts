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