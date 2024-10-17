export function init_toggle(id: string, save_name: string, on_changed: (value: boolean) => void)
{
    let toggle = document.getElementById(id);
    if (toggle === null) return null;
    let initial_value = get_toggle_value(save_name);
    set_toggle_opacity(initial_value);

    toggle.addEventListener('click', _ => {
        let value = get_toggle_value(save_name);
        let new_value = !value;
        sessionStorage.setItem(save_name, JSON.stringify(new_value));
        set_toggle_opacity(new_value);
        on_changed(new_value);
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

export function get_toggle_value(save_name: string): boolean
{
    return JSON.parse(sessionStorage.getItem(save_name) ?? "false");
}