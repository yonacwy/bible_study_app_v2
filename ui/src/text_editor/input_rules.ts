import {Command, Plugin, TextSelection} from "../vendor/prosemirror/prosemirror-state/index.js"
import { ellipsis, emDash, InputRule, inputRules, smartQuotes, textblockTypeInputRule, wrappingInputRule } from "../vendor/prosemirror/prosemirror-inputrules/index.js";
import { SCHEMA } from "./schema.js";
import { MarkType, NodeType } from "../vendor/prosemirror/prosemirror-model/index.js";
import { debug_print } from "../utils/index.js";
import * as bible from "../bible.js";

export function build_input_rules(): Plugin
{
    let rules = smartQuotes.concat(ellipsis, emDash);
    rules.push(block_quote_rule(SCHEMA.nodes.blockquote));
    rules.push(ol_rule(SCHEMA.nodes.ordered_list));
    rules.push(ul_rule(SCHEMA.nodes.bullet_list));
    rules.push(code_block_rule(SCHEMA.nodes.code_block));
    rules.push(heading_rule(SCHEMA.nodes.heading, 6));
    rules = rules.concat(arrow_rules(), verse_rule());
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

function verse_rule(): InputRule
{
    const REGEX = /\[(?<prefix>[\d]+)?\s*(?<name>[a-zA-z](?:.*[a-zA-z])?)\s*(?<chapter>\d+)(?<verse_start>\:\d+)?(?<verse_end>-\d+)?\](?<sp>\s)?/;
    return new InputRule(REGEX, (state, match, start, end) => {
        let node = SCHEMA.nodes.bible_ref;
        
        let prefix_text = match.groups?.prefix;
        let prefix = null;
        if(prefix_text !== undefined) prefix = +prefix_text;

        let name = match.groups!.name;
        let chapter = +match.groups!.chapter;

        let verse_start_text = match.groups?.verse_start;
        let verse_start = null;
        if(verse_start_text !== undefined) verse_start = +verse_start_text.substring(1);

        let verse_end_text = match.groups?.verse_end;
        let verse_end = null;
        if(verse_end_text !== undefined) verse_end = +verse_end_text.substring(1);

        let text = `${name} ${chapter}`;

        if(prefix !== null)
        {
            text = `${prefix} ${text}`;
        }

        if(verse_start !== null)
        {
            text += `:${verse_start}`;
        }

        if(verse_end !== null)
        {
            text += `-${verse_end}`;
        }

        text = `[${text}]`

        // if(match.groups?.sp) start -= 1;

        let attrs = { content: text.trim() };
        return state.tr.replaceWith(start, end, [node.createAndFill(attrs)!]);
        
    })
}