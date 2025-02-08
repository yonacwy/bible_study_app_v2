import * as utils from '../utils/index.js';

let is_playing = false;

export function show_player()
{
    document.getElementById('audio-player')?.classList.remove('hidden');
}

export function init_player()
{
    document.body.appendElementEx('div', ['audio-player', 'hidden'], player_div => {
        player_div.id = 'audio-player';
        player_div.classList.add('spawned');
        handle_dragging(player_div);

        let play_button = build_play_button(player_div);

        player_div.appendElement('input', audio_range => {
            audio_range.type = 'range';
            audio_range.min = '0';
            audio_range.max = '1';
            audio_range.value = '0';
            audio_range.step = '0.001';

            audio_range.addEventListener('mousedown', e => {
                e.stopPropagation();
            });
        })

        player_div.appendElementEx('div', ['play-time'], time_text => {
            time_text.innerHTML = '--:--';
        });

        utils.create_image_button(player_div, '../images/light-xmark.svg', e => {
            player_div.classList.add('hidden');
            is_playing = false;
            (play_button.querySelector('img') as HTMLImageElement).src = "../images/light-play.svg";
        })
    });
    
    utils.init_sliders();
}

function build_play_button(parent: HTMLElement): HTMLButtonElement
{
    let play_button = utils.create_image_button(parent, '../images/light-play.svg', e => {
        e.stopPropagation();
    });

    let image = play_button.querySelector('img') as HTMLImageElement;
    play_button.addEventListener('click', e => {

        if(is_playing)
        {
            is_playing = false;
            image.src = '../images/light-play.svg';
        }
        else 
        {
            is_playing = true;
            image.src = '../images/light-pause.svg';
        }
    });

    return play_button;
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

        element.style.top = (e.clientY - offset.y) + 'px';
        element.style.left = (e.clientX - offset.x) + 'px';

        element.classList.remove('spawned');
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