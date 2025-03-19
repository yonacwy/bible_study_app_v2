import * as editor from "../text_editor/index.js";
import * as utils from "../utils/index.js";

export function init()
{
    let e = editor.spawn_editor({
        id: 'text-editor',
        parent: null
    });

    e.on_input.add_listener(_ => { utils.debug_print('On input') });
    e.on_change.add_listener(_ => { utils.debug_print('On change') });
}