import * as utils from "../utils/index.js";
import * as reader from "../bible_reader.js";

export function show_queue_display()
{
    let display = utils.spawn_element('div', ['queue-display'], display => {
        display.append_element_ex('div', ['popup-content'], content => {
            
            content.append_element_ex('div', ['popup-header'], title => {
                title.appendElement('span', )
            })

            let button = utils.spawn_image_button(utils.images.X_MARK, e => {
                display.remove();
            });
            content.appendChild(button.button);

        });
    });

    document.body.appendChild(display);
}