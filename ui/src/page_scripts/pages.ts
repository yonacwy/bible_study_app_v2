import * as utils from "../utils.js";
import * as view_states from "../view_states.js";

export function init_nav_buttons(previous: string, next: string, on_render: () => void)
{
    utils.on_click(next, e => {
        view_states.next_view_state().then(() => {
            on_render();
        })
    });

    utils.on_click(previous, e => {
        view_states.previous_view_state().then(() => {
            on_render();
        })
    });
}