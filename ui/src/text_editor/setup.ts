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
import { build_keymap } from "./keymap.js"
import { Node } from "../vendor/prosemirror/prosemirror-model/index.js"

export type PluginArgs = {
    node_created_listeners?: { name: string, on_event: (N: Node) => void}[]
}

export function build_plugins(args: PluginArgs): Plugin[]
{
    let listeners = args.node_created_listeners?.map(l => {
        return build_node_event_plugin(l.name, l.on_event);
    }) ?? [];

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
        
        ...listeners
    ]
}

function build_node_event_plugin(type_name: string, on_event: (n: Node) => void): Plugin
{
    return new Plugin({
        appendTransaction: (transactions, old_state, new_state) => {
            transactions.forEach(tr => {
                tr.mapping.maps.forEach(step_map => {
                    step_map.forEach((old_start, old_end, new_start, new_end) => {
                        let node = new_state.doc.nodeAt(new_start);
                        if(node !== null && node.type.name === type_name)
                        {
                            on_event(node)
                        }
                    });
                });
            });

            return null;
        }
    })
}