import {DOMOutputSpec, Schema} from "../vendor/prosemirror/prosemirror-model/index.js"
import { MarkSpec, NodeSpec } from "../vendor/prosemirror/prosemirror-model/schema.js";
import { addListNodes } from "../vendor/prosemirror/prosemirror-schema-list/index.js";

const P_DOM: DOMOutputSpec = ["p", 0];
const BLOCKQUOTE_DOM: DOMOutputSpec = ["blockquote", 0];
const HR_DOM: DOMOutputSpec = ["hr"];
const PRE_DOM: DOMOutputSpec = ["pre", ["code", 0]];
const BR_DOM: DOMOutputSpec = ["br"];

export const VERSEREF_NAME: string = 'verseref';
const VERSEREF_DOM: DOMOutputSpec = [VERSEREF_NAME, 0];


export const NODES: { [name: string]: NodeSpec } = {
    doc: {
        content: 'block+',
    },

    paragraph: {
        content: 'inline*',
        group: 'block',
        parseDOM: [{tag: 'p'}],
        toDOM: _ => P_DOM,
    },

    blockquote: {
        content: 'block+',
        group: 'block',
        defining: true,
        parseDOM: [{tag: 'blockquote'}],
        toDOM: _ => BLOCKQUOTE_DOM,
    },

    horizontal_rule: {
        group: 'block',
        parseDOM: [{tag: 'hr'}],
        toDOM: _ => HR_DOM,
    },

    heading: {
        attrs: {level: {default: 1, validate: 'number'}},
        content: 'inline*',
        group: 'block',
        defining: true,
        parseDOM: [
            {tag: 'h1', attrs: {level: 1}},
            {tag: 'h2', attrs: {level: 2}},
            {tag: 'h3', attrs: {level: 3}},
            {tag: 'h4', attrs: {level: 4}},
            {tag: 'h5', attrs: {level: 5}},
            {tag: 'h6', attrs: {level: 6}},
        ],
        toDOM: node => ['h' + node.attrs.level, 0]
    },

    code_block: {
        content: 'text*',
        marks: '',
        group: 'block',
        code: true,
        defining: true,
        parseDOM: [{tag: 'pre', preserveWhitespace: 'full'}],
        toDOM: _ => PRE_DOM,
    },

    text: {
        group: 'inline'
    },

    image: {
        inline: true,
        attrs: {
            src: {validate: 'string'},
            alt: {default: null, validate: 'string|null'},
            title: {default: null, validate: 'string|null'}
        },
        group: 'inline',
        draggable: true,
        parseDOM: [{tag: 'img[src]', getAttrs: (dom: HTMLElement) => {
            return {
                src: dom.getAttribute('src'),
                title: dom.getAttribute('title'),
                alt: dom.getAttribute('alt'),
            }
        }}],
        toDOM: node => {
            let {src, alt, title} = node.attrs;
            return ["img", {src, alt, title}]
        }
    },

    hard_break: {
        inline: true,
        group: 'inline',
        selectable: false,
        parseDOM: [{tag: 'br'}],
        toDOM: _ => BR_DOM
    },

    verseref: {
        inline: true,
        group: 'inline',
        parseDOM: [{tag: 'verseref'}],
        toDOM: _ => VERSEREF_DOM,
    },
}

const EM_DOM: DOMOutputSpec = ['em', 0];
const STRONG_DOM: DOMOutputSpec = ['strong', 0];
const CODE_DOM: DOMOutputSpec = ['code', 0];
const STRIKETHROUGH_DOM: DOMOutputSpec = ['s', 0];
const UNDERLINE_DOM: DOMOutputSpec = ['u', 0];

export type MarkType = 'link' | 'em' | 'strong' | 'code'
export const MARKS: { [name: string]: MarkSpec } = {

    link: {
        attrs: {
            href: {validate: 'string'},
            title: {default: null, validate: 'string|null'}, 
        },
        inclusive: false,
        parseDOM: [{tag: 'a[href]', getAttrs: (dom: HTMLElement) => {
            return {href: dom.getAttribute('href'), title: dom.getAttribute('title')}
        }}],
        toDOM: node => {
            let {href, title} = node.attrs;
            return ['a', {href, title}, 0]
        }
    },

    em: {
        parseDOM: [
            {tag: 'i'}, 
            {tag: 'em'},
            {style: 'font-style=italic'},
            {style: 'font-style=normal', clearMark: m => m.type.name == 'em'}
        ],
        toDOM: _ => EM_DOM
    },

    strong: {
        parseDOM: [
          {tag: "strong"},
          // This works around a Google Docs misbehavior where
          // pasted content will be inexplicably wrapped in `<b>`
          // tags with a font-weight normal.
          {tag: "b", getAttrs: (node: HTMLElement) => node.style.fontWeight != "normal" && null},
          {style: "font-weight=400", clearMark: m => m.type.name == "strong"},
          {style: "font-weight", getAttrs: (value: string) => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null},
        ],
        toDOM: _ => STRONG_DOM,
    },

    code: {
        parseDOM: [{tag: 'code'}],
        toDOM: _ => CODE_DOM,
    },

    strikethrough: {
        parseDOM: [
            {tag: 's'},
            {tag: 'del'}
        ],
        toDOM: _ => STRIKETHROUGH_DOM,
    },

    underline: {
        parseDOM: [{tag: 'u'}],
        toDOM: _ => UNDERLINE_DOM,
    }
}

let schema = new Schema({nodes: NODES, marks: MARKS});

schema = new Schema({
    nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
    marks: schema.spec.marks,
})

export const SCHEMA: Schema = schema;