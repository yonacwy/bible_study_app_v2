import * as utils from "../utils/index.js";

import {EditorState} from "../vendor/prosemirror/prosemirror-state/index.js"
import {EditorView} from "../vendor/prosemirror/prosemirror-view/index.js"
import {Schema, DOMParser, Node} from "../vendor/prosemirror/prosemirror-model/index.js"
import * as setup from "./setup.js";
import { SCHEMA } from "./schema.js";
import { EventHandler } from "../utils/events.js";

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
    private readonly root: HTMLElement;
    private readonly editor: HTMLElement;
    private readonly content: HTMLElement;
    private readonly view: EditorView;

    public readonly on_change: EventHandler<void> = new EventHandler();
    public readonly on_input: EventHandler<void> = new EventHandler();

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

        this.content.addEventListener('change', e => {
            this.on_change.invoke()
        });

        this.content.addEventListener('input', e => {
            this.on_input.invoke();
        })

        let parent = args.parent ?? document.body;
        parent.appendChild(this.root);
    
        this.view = new EditorView(document.querySelector(`#${args.id} > .editor`), {
            state: EditorState.create({
                doc: DOMParser.fromSchema(SCHEMA).parse(this.content),
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
        this.view.state.doc = DOMParser.fromSchema(SCHEMA).parse(this.content);
        this.view.update({
            state: this.view.state,
        })
    }
    
    public get_content_json(): string 
    {
        return JSON.stringify(this.view.state.doc.toJSON());
    }

    public set_content_json(json: string): boolean
    {
        try 
        {
            let data = JSON.parse(json);
            this.view.state.doc = Node.fromJSON(SCHEMA, data);
            return true;
        }
        catch 
        {
            utils.debug_print('Error formatting json content');
            return false;
        }
    }
}