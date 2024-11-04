import * as utils from "../utils/index.js";

export type ContextMenuCommand = {
    name: string,
    command: () => Promise<void>,
}

export function init_context_menu(selector: string, commands: ContextMenuCommand[])
{
    let menu = document.getElementById('context-menu') as HTMLElement;
    document.querySelectorAll(selector).forEach(element => {
        if(!(element instanceof HTMLElement)) return;

        element.addEventListener('contextmenu', e => {
            e.preventDefault();
            show_popup(menu, commands, e);
        });
    });

    document.addEventListener('click', e => {
        hide_popup(menu);
    });
}

function show_popup(menu: HTMLElement, commands: ContextMenuCommand[], event: MouseEvent)
{
    menu.style.left = event.pageX + 'px';
    menu.style.top = event.pageY + 'px';
    
    menu.classList.remove('hidden');
    menu.replaceChildren();

    commands.forEach(command => {
        menu.appendElement('li', div => {
            div.innerHTML = command.name;
            div.addEventListener('click', _ => {
                utils.debug_print(command.name);
                hide_popup(menu);
            })
        })
    });
}

function hide_popup(menu: HTMLElement)
{
    menu.classList.add('hidden');
}