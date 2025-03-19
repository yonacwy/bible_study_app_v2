import {Command, Plugin, TextSelection} from "../vendor/prosemirror/prosemirror-state/index.js"
import { ellipsis, emDash, InputRule, inputRules, smartQuotes, textblockTypeInputRule, wrappingInputRule } from "../vendor/prosemirror/prosemirror-inputrules/index.js";
import { SCHEMA } from "./schema.js";
import { MarkType, NodeType } from "../vendor/prosemirror/prosemirror-model/index.js";
import { debug_print } from "../utils/index.js";

export function build_input_rules(): Plugin
{
    let rules = smartQuotes.concat(ellipsis, emDash);
    rules.push(block_quote_rule(SCHEMA.nodes.blockquote));
    rules.push(ol_rule(SCHEMA.nodes.ordered_list));
    rules.push(ul_rule(SCHEMA.nodes.bullet_list));
    rules.push(code_block_rule(SCHEMA.nodes.code_block));
    rules.push(heading_rule(SCHEMA.nodes.heading, 6));
    rules = rules.concat(arrow_rules(), verse_rules());
    return inputRules({rules});
}

function block_quote_rule(node_type: NodeType): InputRule
{
    return wrappingInputRule(/^\s*>\s$/, node_type);
}

function ol_rule(node_type: NodeType): InputRule
{
    return wrappingInputRule(/^(\d+)\.\s$/, node_type, match => ({order: +match[1]}),
                           (match, node) => node.childCount + node.attrs.order == +match[1])
}

function ul_rule(node_type: NodeType): InputRule
{
    return wrappingInputRule(/^\s*([-+*])\s$/, node_type)
}

function code_block_rule(node_type: NodeType): InputRule
{
    return textblockTypeInputRule(/^```$/, node_type);
}

function heading_rule(node_type: NodeType, max_level: number): InputRule
{
    let regex = new RegExp("^(#{1," + max_level + "})\\s$");
    return textblockTypeInputRule(regex, node_type, match => ({level: match[1].length}))
}

function arrow_rules(): InputRule[]
{
    return [
        new InputRule(/\-\-\>$/, "→"), // arrow
        new InputRule(/—\>$/, "→"), // arrow
        new InputRule(/\<\-\-$/, "←"), // arrow
        new InputRule(/\<—$/, "←"), // arrow
        new InputRule(/\<\-\>$/, "↔"), // arrow
        new InputRule(/\=\=\>$/, "⇒"), // arrow
        new InputRule(/\<\=\=$/, "⇐"), // arrow
        new InputRule(/\<\=\>$/, "⇔"), // arrow
    ]
}

function verse_rules(): InputRule[]
{
    return [
        mark_section_input_rule(/v\d+\s$/, SCHEMA.marks.strong),
    ];
}

function mark_section_input_rule(regex: RegExp, mark_type: MarkType): InputRule
{
    // return new InputRule(regex, (state, match, start, end) => {
    //     let mark = SCHEMA.mark(mark_type);
    //     debug_print(`s: ${start}; e: ${end}`);
    //     return state.tr.insertText('<strong>hi</strong>', start, end).addMark(start, end, mark);
        
    // })

    return new InputRule(/(?:\*\*|__)([^*_]+)(?:\*\*|__)$/, (state, match, start, end) => {
        const tr = state.tr;
        const text = match[1]; // Captured text inside ** or __
        
        // Remove the ** or __ from the text
        tr.delete(start, end);
        tr.insertText(text, start);
        
        // Apply the strong mark
        tr.addMark(start, start + text.length, mark_type.create());

        tr.removeStoredMark(mark_type); // Prevents further typing from being bold
        tr.setSelection(TextSelection.near(tr.doc.resolve(start + text.length)));
        debug_print('got here');
        return tr;
    });
}