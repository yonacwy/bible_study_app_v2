import {Schema} from "../vendor/prosemirror/prosemirror-model/index.js"
import {schema} from "../vendor/prosemirror/schema-basic.js"
import {addListNodes} from "../vendor/prosemirror/prosemirror-schema-list/index.js"

export function build_schema(): Schema
{
    return new Schema({
        nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
        marks: schema.spec.marks
    });
}