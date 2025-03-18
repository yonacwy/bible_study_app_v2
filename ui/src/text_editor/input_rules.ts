import {Command, Plugin} from "../vendor/prosemirror/prosemirror-state/index.js"
import { ellipsis, emDash, InputRule, inputRules, smartQuotes, textblockTypeInputRule, wrappingInputRule } from "../vendor/prosemirror/prosemirror-inputrules/index.js";
import { SCHEMA } from "./schema.js";
import { NodeType } from "../vendor/prosemirror/prosemirror-model/index.js";

export function build_input_rules(): Plugin
{
    let rules = smartQuotes.concat(ellipsis, emDash);
    rules.push(block_quote_rule(SCHEMA.nodes.blockquote));
    rules.push(ol_rule(SCHEMA.nodes.ordered_list));
    rules.push(ul_rule(SCHEMA.nodes.bullet_list));
    rules.push(code_block_rule(SCHEMA.nodes.code_block));
    rules.push(heading_rule(SCHEMA.nodes.heading, 6));
    rules = rules.concat(arrow_rules());
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