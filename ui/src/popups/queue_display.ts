import * as utils from "../utils/index.js";

export function show_queue_display()
{
    let display = utils.spawn_element('div', ['queue-display'], display => {
        display.appendElementEx('div', ['popup-content'], content => {
            
            let button = utils.spawn_image_button(utils.images.X_MARK, e => {
                display.remove();
            });
            content.appendChild(button.button);
        });
    });

    document.body.appendChild(display);
}