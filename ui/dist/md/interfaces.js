/**
 * @license
 *
 * Copyright (c) 2018-2021, Костя Третяк. (MIT Licensed)
 * https://github.com/ts-stack/markdown
 */
import { escape, unescape } from './helpers.js';
export var TokenType;
(function (TokenType) {
    TokenType[TokenType["space"] = 1] = "space";
    TokenType[TokenType["text"] = 2] = "text";
    TokenType[TokenType["paragraph"] = 3] = "paragraph";
    TokenType[TokenType["heading"] = 4] = "heading";
    TokenType[TokenType["listStart"] = 5] = "listStart";
    TokenType[TokenType["listEnd"] = 6] = "listEnd";
    TokenType[TokenType["looseItemStart"] = 7] = "looseItemStart";
    TokenType[TokenType["looseItemEnd"] = 8] = "looseItemEnd";
    TokenType[TokenType["listItemStart"] = 9] = "listItemStart";
    TokenType[TokenType["listItemEnd"] = 10] = "listItemEnd";
    TokenType[TokenType["blockquoteStart"] = 11] = "blockquoteStart";
    TokenType[TokenType["blockquoteEnd"] = 12] = "blockquoteEnd";
    TokenType[TokenType["code"] = 13] = "code";
    TokenType[TokenType["table"] = 14] = "table";
    TokenType[TokenType["html"] = 15] = "html";
    TokenType[TokenType["hr"] = 16] = "hr";
})(TokenType || (TokenType = {}));
export class MarkedOptions {
    gfm = true;
    tables = true;
    breaks = false;
    pedantic = false;
    sanitize = false;
    sanitizer;
    mangle = true;
    smartLists = false;
    silent = false;
    /**
     * @param code The section of code to pass to the highlighter.
     * @param lang The programming language specified in the code block.
     */
    highlight;
    langPrefix = 'lang-';
    smartypants = false;
    headerPrefix = '';
    /**
     * An object containing functions to render tokens to HTML. Default: `new Renderer()`
     */
    renderer;
    /**
     * Self-close the tags for void elements (&lt;br/&gt;, &lt;img/&gt;, etc.)
     * with a "/" as required by XHTML.
     */
    xhtml = false;
    /**
     * The function that will be using to escape HTML entities.
     * By default using inner helper.
     */
    escape = escape;
    /**
     * The function that will be using to unescape HTML entities.
     * By default using inner helper.
     */
    unescape = unescape;
    /**
     * If set to `true`, an inline text will not be taken in paragraph.
     *
     * ```ts
     * // isNoP == false
     * Marked.parse('some text'); // returns '<p>some text</p>'
     *
     * Marked.setOptions({isNoP: true});
     *
     * Marked.parse('some text'); // returns 'some text'
     * ```
     */
    isNoP;
}
