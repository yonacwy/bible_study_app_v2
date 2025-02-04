import * as utils from '../utils/index.js';

export function init_player()
{
    document.body.appendElementEx('div', ['audio-player'], player_div => {

        handle_dragging(player_div);

        utils.create_image_button(player_div, '../images/light-play.svg', e => {
            e.stopPropagation();
            utils.debug_print('Hit Play!');
        });

        player_div.appendElement('input', audio_range => {
            audio_range.type = 'range';
            audio_range.min = '0';
            audio_range.max = '1';
            audio_range.step = '0.001';

            audio_range.addEventListener('mousedown', e => {
                e.stopPropagation();
            });
        })

        player_div.appendElementEx('div', ['play-time'], time_text => {
            time_text.innerHTML = '--:--';
            // time_text.addEventListener('mousedown', e => e.stopPropagation());
        })
    });
    
    utils.init_sliders();
}

function handle_dragging(element: HTMLElement)
{
    let is_dragging = false;
    let offset = { x: 0, y: 0 };
    element.addEventListener('mousedown', e => {
        is_dragging = true;

        let rect = element.getBoundingClientRect();

        offset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    });

    document.addEventListener('mousemove', e => {
        if(is_dragging)
        {
            element.style.top = (e.clientY - offset.y) + 'px';
            element.style.left = (e.clientX - offset.x) + 'px';
        }
    });

    document.addEventListener('mouseup', e => {
        is_dragging = false;
    })
}