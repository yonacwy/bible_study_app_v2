import * as utils from '../utils/index.js';

let is_playing = false;

export function show_player()
{
    document.getElementById('audio-player')?.classList.remove('hidden');
    utils.tts.play();
    utils.tts.pause();
}

export function init_player()
{
    document.body.appendElementEx('div', ['audio-player', 'hidden'], player_div => {
        player_div.id = 'audio-player';
        player_div.classList.add('spawned');
        handle_dragging(player_div);

        let play_button = build_play_button(player_div);

        let is_updating = false;

        let audio_slider = player_div.appendElement('input', audio_range => {
            audio_range.type = 'range';
            audio_range.min = '0';
            audio_range.max = '1';
            audio_range.value = '0';
            audio_range.step = '0.001';

            utils.listen_event('tts_progress', async elapsed => {
                if(!is_updating)
                {
                    let percent = (elapsed.payload as number) / await utils.tts.get_duration();
                    audio_range.value = `${percent}`;
                    utils.update_sliders();
                }
            });

            audio_range.addEventListener('input', e => {
                is_updating = true;
            });

            document.addEventListener('mouseup', async e => {
                if(is_updating)
                {
                    utils.debug_print('set value');
                    is_updating = false;
                    utils.tts.set_time(+audio_range.value * await utils.tts.get_duration())
                }
            })

            audio_range.addEventListener('mousedown', e => {
                e.stopPropagation();
            });
        })

        let time_text = player_div.appendElementEx('div', ['play-time'], time_text => {
            time_text.innerHTML = '--:--';

            utils.listen_event('tts_progress', elapsed => {
                if(!is_updating)
                {
                    let current = (elapsed.payload as number);
                    set_time_text(current, time_text);
                }
            })
        });

        audio_slider.addEventListener('input', async e => {
            let current = +audio_slider.value * await utils.tts.get_duration();
            set_time_text(current, time_text);
        })

        utils.create_image_button(player_div, '../images/light-xmark.svg', e => {
            player_div.classList.add('hidden');
            audio_slider.value = '0';
            reset_player_position(player_div);

            utils.tts.stop();
            is_playing = false;
            
            (play_button.querySelector('img') as HTMLImageElement).src = "../images/light-play.svg";
        })
    });
    
    utils.init_sliders();
}

function set_time_text(current: number, element: HTMLElement)
{
    let mins = Math.floor(current / 60);
    let secs = Math.round((current - mins * 60));
    let secs_str = secs < 10 ? `0${secs}` : `${secs}`;
    element.innerHTML = `${mins}:${secs_str}`;
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
            utils.tts.pause();
        }
        else 
        {
            is_playing = true;
            image.src = '../images/light-pause.svg';
            utils.tts.resume();
        }
    });

    return play_button;
}

function reset_player_position(element: HTMLElement)
{
    element.classList.add('spawned');
    element.style.left = '';
    element.style.top = '';
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