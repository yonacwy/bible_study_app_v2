import * as utils from "../utils/index.js";

export type ContextMenuCommand = {
    name: string,
    command: () => Promise<void>,
}

export type ContextSubMenu = {
    name: string,
    args: ContextMenuArg[]
}

export type ContextMenuArg = ContextMenuCommand | ContextSubMenu;

export function is_context_menu_active(): boolean
{
    let context_menu = document.getElementById('context-menu');
    if(context_menu)
    {
        return !context_menu.classList.contains('hidden');
    }

    return false;
}

export function init_context_menu(args: ContextMenuArg[], should_interrupt: () => Promise<boolean>)
{
    let menu = document.getElementById('context-menu') as HTMLElement | null;
    if(menu === null) return;
    build_menu(menu, args, true);
    document.addEventListener('contextmenu', async e => {
        e.preventDefault();
        let interrupt = await should_interrupt();
        if(!interrupt)
        {
            show_popup(menu, e);
        }
    });

    document.addEventListener('click', e => {
        hide_popup(menu);
    });
}

const SIZE_PADDING = 10;
// hacky fix to bug where the context window will shift 10px when clicked again. 
// I have no idea as to why this is the case
let is_showing: boolean = false; 

function show_popup(menu: HTMLElement, event: MouseEvent)
{
    is_showing = !menu.classList.contains('hidden')
    menu.classList.remove('hidden');

    let window_size = {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
    }

    let menu_rect = menu.getBoundingClientRect();

    if(event.pageX + menu_rect.width + SIZE_PADDING > window_size.width)
    {
        menu.style.left = (window_size.width - menu_rect.width - SIZE_PADDING) + 'px';
    }
    else 
    {
        menu.style.left = event.pageX + 'px';
    }

    if(event.pageY + menu_rect.height + SIZE_PADDING > window_size.height)
    {
        menu.style.top = (window_size.height - menu_rect.height - SIZE_PADDING) + 'px'
    }
    else 
    {
        menu.style.top = event.pageY + 'px';
    }

    move_sub_menus(menu);
}

function move_sub_menus(root: HTMLElement)
{
    let window_size = {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
    }

    // HACK:
    // The default is display: none, which means the width is 0, so we have to add then remove the display: block
    root.querySelectorAll('.sub-menu').forEach(element => {
        if(!(element instanceof HTMLElement)) return;
        element.style.display = "block";
    })

    root.querySelectorAll('.sub-menu').forEach(element => {
        if(!(element instanceof HTMLElement)) return;
        element.style.left = "";
        element.style.top = "";

        let rect = element.getBoundingClientRect();
        if(rect.width + rect.left + SIZE_PADDING > window_size.width)
        {
            element.style.left = `-${rect.width}px`;
        }
        else 
        {
            element.style.left = '100%';
        }

        if(rect.height + rect.top + SIZE_PADDING > window_size.height)
        {
            let desired = window_size.height - rect.height
            let diff = rect.top - desired;
            element.style.top = `${-diff - (is_showing ? SIZE_PADDING * 2 : SIZE_PADDING * 3)}px`; // do not ask me why.......
        }
    });

    // HACK:
    // The default is display: none, which means the width is 0, so we have to add then remove the display: block
    root.querySelectorAll('.sub-menu').forEach(element => {
        if(!(element instanceof HTMLElement)) return;
        element.style.display = "";
    })
}

function build_menu(menu: HTMLElement, args: ContextMenuArg[], is_main: boolean)
{
    let z_index = menu.style.zIndex + 1;
    args.forEach(arg => {
        menu.appendElement('li', div => {
            let command = arg as ContextMenuCommand
            if(command.command !== undefined)
            {
                div.innerHTML = arg.name;
                div.addEventListener('click', _ => {
                    command.command()
                    if(is_main) hide_popup(menu);
                });
            }

            let sub_menu = arg as ContextSubMenu;
            if(sub_menu.args !== undefined)
            {
                div.appendElement('span', span => span.innerHTML = sub_menu.name);
                div.appendElement('div', sub_menu_node => {
                    sub_menu_node.style.zIndex = z_index;
                    sub_menu_node.classList.add('sub-menu');
                    build_menu(sub_menu_node, sub_menu.args, false);
                })
            }
        })
    });
}

function hide_popup(menu: HTMLElement)
{
    menu.classList.add('hidden');
}