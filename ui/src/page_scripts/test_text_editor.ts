import * as editor from "../text_editor/index.js";
import * as utils from "../utils/index.js";

export function init()
{
    let e = editor.spawn_editor({
        id: 'text-editor',
        parent: null
    });
}