import { joinUp, lift, selectParentNode, toggleMark } from "../vendor/prosemirror/prosemirror-commands/index.js";
import { blockTypeItem, Dropdown, DropdownSubmenu, icons, IconSpec, joinUpItem, liftItem, MenuElement, MenuItem, MenuItemSpec, redoItem, selectParentNodeItem, undoItem, wrapItem } from "../vendor/prosemirror/prosemirror-menu/index.js";
import { MarkType, NodeType } from "../vendor/prosemirror/prosemirror-model/schema.js";
import { wrapInList } from "../vendor/prosemirror/prosemirror-schema-list/index.js";
import { EditorState } from "../vendor/prosemirror/prosemirror-state/state.js";
import { Command } from "../vendor/prosemirror/prosemirror-state/transaction.js";
import {SCHEMA} from "./schema.js";
import * as utils from "../utils/index.js";
import { redo, undo } from "../vendor/prosemirror/prosemirror-history/index.js";

type MarkItemData = {
    name: string,
    title: string,
    icon: string,
}

export function build_menu(): MenuElement[][]
{
    let basic = make_basic_menu();
    let type_menu = make_type_menu();
    let lists = make_list_menu();
    let history = make_history_menu();

    return [history, basic, type_menu, lists];
}

function make_history_menu(): MenuElement[]
{
    let undoItem = new MenuItem({
        title: "Undo last change",
        run: undo,
        enable: state => undo(state),
        icon: spawn_menu_icon(utils.images.UNDO)
    });
    
    let redoItem = new MenuItem({
        title: "Redo last undone change",
        run: redo,
        enable: state => redo(state),
        icon: spawn_menu_icon(utils.images.REDO)
    });

    return [undoItem, redoItem]
}

function make_list_menu(): MenuElement[]
{
    let ul = wrap_list_item(SCHEMA.nodes.bullet_list, {
        title: 'Wrap in bullet list',
        icon: spawn_menu_icon(utils.images.UNORDERED_LIST)
    });

    let ol = wrap_list_item(SCHEMA.nodes.ordered_list, {
        title: 'Wrap in numbered list',
        icon: spawn_menu_icon(utils.images.ORDERED_LIST),
    })

    let quote = wrapItem(SCHEMA.nodes.blockquote, {
        title: 'Wrap in block quote',
        icon: spawn_menu_icon(utils.images.BLOCKQUOTE),
    });

    let lift_item = new MenuItem({
      title: "Lift out of enclosing block",
      run: lift,
      select: state => lift(state),
      icon: spawn_menu_icon(utils.images.OUTDENT)
    })

    /// Menu item for the `joinUp` command.
    let join_up_item = new MenuItem({
      title: "Join with above block",
      run: joinUp,
      select: state => joinUp(state),
      icon: spawn_menu_icon(utils.images.JOIN)
    })

    return [ul, ol, quote, lift_item, join_up_item];
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

function make_type_menu(): MenuElement[]
{
    let headings = utils.ranges.range_inclusive(1, 6).map(i => {
        return blockTypeItem(SCHEMA.nodes.heading, {
            title: `Change to heading ${i}`,
            label: `Level ${i}`,
            attrs: {level: i}
        }) as MenuElement;
    }).toArray();

    let paragraph = blockTypeItem(SCHEMA.nodes.paragraph, {
        title: 'Change to paragraph',
        label: 'Plain'
    });

    let code_block = blockTypeItem(SCHEMA.nodes.paragraph, {
        title: 'Change to code block',
        label: 'Code',
    });

    let dropdown = new Dropdown([paragraph, code_block, 
        new DropdownSubmenu(headings, { label: 'Heading' })], 
        { label: 'Type...' });

    return [dropdown];
}

function spawn_menu_icon(path: string): IconSpec
{
    let dom = utils.spawn_element('img', [], img => {
        img.src = path;
        img.style.width = '1em';
        img.style.height = '1em';
    });

    return { dom }
}

function create_mark_item(data: MarkItemData): MenuItem
{
    let title = data.title;
    let mark = SCHEMA.marks[data.name];
    return mark_item(mark, { title, icon: spawn_menu_icon(data.icon) });
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