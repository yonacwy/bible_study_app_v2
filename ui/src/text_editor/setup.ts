import {Command, Plugin} from "../vendor/prosemirror/prosemirror-state/index.js"
import { keymap } from "../vendor/prosemirror/prosemirror-keymap/index.js"
import { dropCursor } from "../vendor/prosemirror/prosemirror-dropcursor/index.js"
import { gapCursor } from "../vendor/prosemirror/prosemirror-gapcursor/index.js"
import { undoInputRule } from "../vendor/prosemirror/prosemirror-inputrules/inputrules.js"
import { SCHEMA } from "./schema.js"
import { baseKeymap, joinDown, joinUp, lift, selectParentNode, setBlockType, toggleMark, wrapIn } from "../vendor/prosemirror/prosemirror-commands/index.js"
import { history, redo, undo } from "../vendor/prosemirror/prosemirror-history/index.js"
import { liftListItem, sinkListItem, splitListItem, wrapInList } from "../vendor/prosemirror/prosemirror-schema-list/index.js"
import { menuBar } from "../vendor/prosemirror/prosemirror-menu/index.js";
import * as menu from "./menu.js";
import { debug_print } from "../utils/index.js"
import { build_input_rules } from "./input_rules.js"

const mac: boolean = typeof navigator != "undefined" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : false

export type PluginArgs = {
    
}

export function build_plugins(args: PluginArgs): Plugin[]
{
    return [
        build_input_rules(),
        keymap(build_keymap()),
        keymap(baseKeymap),
        dropCursor(),
        gapCursor(),
        history(),
        menuBar({floating: false, content: menu.build_menu()}),
        new Plugin({
            props: {
                attributes: {class: 'ProseMirror-example-setup-style'}
            }
        }),
    ]
}

// yoinked from: https://github.com/ProseMirror/prosemirror-example-setup/blob/master/src/keymap.ts 

function build_keymap(mapKeys?: {[key: string]: false | string}) {
    let keys: {[key: string]: Command} = {}

    function bind(key: string, cmd: Command) 
    {
        if (mapKeys) 
        {
            let mapped = mapKeys[key]
            if (mapped === false) return
            if (mapped) key = mapped
        }

        keys[key] = cmd
    }

    bind("Mod-z", undo)
    bind("Shift-Mod-z", redo)
    bind("Backspace", undoInputRule)
    if (!mac) bind("Mod-y", redo)

    bind("Alt-ArrowUp", joinUp)
    bind("Alt-ArrowDown", joinDown)
    bind("Mod-BracketLeft", lift)
    bind("Escape", selectParentNode)
    
    let type = undefined;
    if (type = SCHEMA.marks.strong) 
    {
        bind("Mod-b", toggleMark(type))
        bind("Mod-B", toggleMark(type))
    }

    if (type = SCHEMA.marks.em) 
    {
        bind("Mod-i", toggleMark(type))
        bind("Mod-I", toggleMark(type))
    }

    if (type = SCHEMA.marks.code)
    {
        bind("Mod-`", toggleMark(type))
    }

    if (type = SCHEMA.nodes.bullet_list)
    {
        bind("Shift-Ctrl-8", wrapInList(type))
    }

    if (type = SCHEMA.nodes.ordered_list)
    {
        bind("Shift-Ctrl-9", wrapInList(type))
    }
    if (type = SCHEMA.nodes.blockquote)
    {
        bind("Ctrl->", wrapIn(type))
    }

    if (type = SCHEMA.nodes.list_item) 
    {
        bind("Enter", splitListItem(type))
        bind("Mod-[", liftListItem(type))
        bind("Mod-]", sinkListItem(type))
    }

    if (type = SCHEMA.nodes.paragraph)
    {
        bind("Shift-Ctrl-0", setBlockType(type))
    }

    if (type = SCHEMA.nodes.code_block)
    {
        bind("Shift-Ctrl-\\", setBlockType(type))
    }

    if (type = SCHEMA.nodes.heading)
    {
        for (let i = 1; i <= 6; i++) 
        {
            bind("Shift-Ctrl-" + i, setBlockType(type, {level: i}));
        }
    }

    if (type = SCHEMA.nodes.horizontal_rule) 
    {
        let hr = type
        bind("Mod-_", (state, dispatch) => {
            if (dispatch) dispatch(state.tr.replaceSelectionWith(hr.create()).scrollIntoView())
            return true
        })
    }

    return keys
}