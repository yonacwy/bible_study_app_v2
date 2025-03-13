import {EditorState} from "./prosemirror-state/index.js"
import {EditorView} from "./prosemirror-view/index.js"
import {Schema, DOMParser} from "./prosemirror-model/index.js"
import {schema} from "./schema-basic.js"
import {addListNodes} from "./prosemirror-schema-list/index.js"
import {exampleSetup} from "./prosemirror-setup/index.js"

import * as utils from "../../utils/index.js"

// Mix the nodes from prosemirror-schema-list into the basic schema to
// create a schema with list support.

export function init()
{
	const mySchema = new Schema({
		nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
		marks: schema.spec.marks
	});

	(window as any).view = new EditorView(document.querySelector("#editor"), {
		state: EditorState.create({
		doc: DOMParser.fromSchema(mySchema).parse(document.querySelector("#content") as HTMLElement),
			plugins: exampleSetup({schema: mySchema})
		})
	})
}