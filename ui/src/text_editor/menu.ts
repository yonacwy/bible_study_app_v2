import { toggleMark } from "../vendor/prosemirror/prosemirror-commands/index.js";
import { icons, IconSpec, MenuElement, MenuItem, MenuItemSpec } from "../vendor/prosemirror/prosemirror-menu/index.js";
import { MarkType, NodeType } from "../vendor/prosemirror/prosemirror-model/schema.js";
import { wrapInList } from "../vendor/prosemirror/prosemirror-schema-list/index.js";
import { buildMenuItems } from "../vendor/prosemirror/prosemirror-setup/menu.js";
import { EditorState } from "../vendor/prosemirror/prosemirror-state/state.js";
import { Command } from "../vendor/prosemirror/prosemirror-state/transaction.js";
import {SCHEMA} from "./schema.js";
import * as utils from "../utils/index.js";

type MarkItemData = {
    name: string,
    title: string,
    icon: string,
}

export function build_menu(): MenuElement[][]
{
    let basic = make_basic_menu();    

    return [basic,];
}

function make_list_menu(): MenuElement[]
{
    let ol = wrap_list_item(SCHEMA.nodes.ordered_list, {
        title: 'Wrap',
        
    })
}

function make_basic_menu(): MenuElement[]
{
    let strong = create_mark_item({
        name: 'strong',
        icon: utils.images.BOLD,
        title: 'Toggle bold text'
    });

    let em = create_mark_item({
        name: 'em',
        icon: utils.images.ITALIC,
        title: 'Toggle italic text'
    });

    let code = create_mark_item({
        name: 'code',
        icon: utils.images.CODE,
        title: 'Toggle code text',
    });

    let underline = create_mark_item({
        name: 'underline',
        icon: utils.images.UNDERLINE,
        title: 'Toggle underline text',
    });

    let strikethrough = create_mark_item({
        name: 'strikethrough',
        icon: utils.images.STRIKETHROUGH,
        title: 'Toggle strikethrough text',
    })

    return [strong, em, code, underline, strikethrough];
}

function spawn_menu_icon(path: string): HTMLImageElement
{
    return utils.spawn_element('img', [], img => {
        img.src = path;
        img.style.width = '1em';
        img.style.height = '1em';
    });
}

function create_mark_item(data: MarkItemData): MenuItem
{
    let img = spawn_menu_icon(data.icon);

    let title = data.title;
    let mark = SCHEMA.marks[data.name];
    return mark_item(mark, { title, icon: { dom: img } });
}

function mark_item(mark_type: MarkType, options: Partial<MenuItemSpec>): MenuItem
{
    let passed_options: Partial<MenuItemSpec> = {
        active(state) { return mark_active(state, mark_type) }
    }

    for(let prop in options)
    {
        (passed_options as any)[prop] = (options as any)[prop];
    }

    return cmd_item(toggleMark(mark_type), passed_options)
}

function wrap_list_item(node_type: NodeType, options: Partial<MenuItemSpec>): MenuItem
{
    return cmd_item(wrapInList(node_type, (options as any).attrs), options);
}

function cmd_item(cmd: Command, options: Partial<MenuItemSpec>): MenuItem
{
    let passed_options: MenuItemSpec = {
        label: options.title as string | undefined,
        run: cmd
    }

    for(let prop in options)
    {
        (passed_options as any)[prop] = (options as any)[prop];
    }

    if(!options.enable && !options.select)
    {
        passed_options[options.enable ? 'enable' : 'select'] = state => cmd(state)
    }

    return new MenuItem(passed_options);
}

function mark_active(state: EditorState, type: MarkType): boolean
{
    let {from, $from, to, empty} = state.selection;
    if(empty) return !!type.isInSet(state.storedMarks || $from.marks());
    else return state.doc.rangeHasMark(from, to, type);
}