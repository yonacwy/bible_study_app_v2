import * as utils from "../utils/index.js";

import {EditorState} from "../vendor/prosemirror/prosemirror-state/index.js"
import {EditorView} from "../vendor/prosemirror/prosemirror-view/index.js"
import {Schema, DOMParser} from "../vendor/prosemirror/prosemirror-model/index.js"
import {schema} from "../vendor/prosemirror/schema-basic.js"
import {addListNodes} from "../vendor/prosemirror/prosemirror-schema-list/index.js"
import {exampleSetup} from "../vendor/prosemirror/prosemirror-setup/index.js"
import * as setup from "./setup.js";
import { SCHEMA } from "./schema.js";

export type TextEditorArgs = {
    id: string,
    parent: HTMLElement | null,
}

export function spawn_editor(args: TextEditorArgs): TextEditor
{
    return new TextEditor(args);
}

export class TextEditor
{
    public readonly root: HTMLElement;
    public readonly editor: HTMLElement;
    public readonly content: HTMLElement;
    public readonly view: EditorView;

    public constructor(args: TextEditorArgs)
    {
        this.root = utils.spawn_element('div', ['text-editor'], root => {
            root.id = args.id;
        });

        this.editor = utils.spawn_element('div', ['editor'], editor => {
            this.root.appendChild(editor);
        });

        this.content = utils.spawn_element('div', ['content'], content => {
            this.root.appendChild(content);
            content.style.display = 'none';
        });

        let parent = args.parent ?? document.body;
        parent.appendChild(this.root);
    
        this.view = new EditorView(document.querySelector(`#${args.id} > .editor`), {
            state: EditorState.create({
                doc: DOMParser.fromSchema(SCHEMA).parse(document.querySelector(`#${args.id} > .content`) as HTMLElement),
                plugins: setup.build_plugins({})
            })
        });
    }

    public get_content_html(): string
    {
        return this.content.innerHTML;
    }

    public set_content_html(content: string) 
    {
        this.content.innerHTML = content;
    }
}