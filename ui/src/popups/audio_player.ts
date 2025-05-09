import * as utils from "../utils/index.js";
import * as bible from "../bible.js";
import { TtsFrontendEvent, TtsGenerationProgressEvent, TtsPlayingEvent } from "../utils/tts.js";
import * as view_states from "../view_states.js";
import { spawn_behavior_selector } from "./player_behavior.js";

// To implement on a page, need to call `init_player()` before anything, then whenever the passage chapter is rendered, `on_passage_rendered()` needs to be called

const PLAY_IMAGE_SRC: string = '../images/light-play.svg';
const PAUSE_IMAGE_SRC: string = '../images/light-pause.svg';
const CLOSE_IMAGE_SRC: string = '../images/light-xmark.svg';
const OPEN_DROPDOWN_IMAGE_SRC: string = '../images/light-angle-down.svg';
const CLOSE_DROPDOWN_IMAGE_SRC: string = '../images/light-angle-up.svg';
const VOLUME_IMAGE_SRC: string = '../images/volume/light-volume.svg';
const PLAYBACK_SPEED_SRC: string = '../images/gauges/light-gauge.svg';

type PlayerData = {
    top: number | null,
    left: number | null,
    is_open: boolean,
    is_expanded: boolean,
};

const PLAYER_DATA_STORAGE: utils.storage.ValueStorage<PlayerData> = new utils.storage.ValueStorage<PlayerData>('audio-player-visual-data');

type AudioPlayerData = {
    popup: HTMLElement,
    close_button: utils.ImageButton,
    play_button: utils.ImageButton,
    fast_forward_button: utils.ImageButton,
    rewind_button: utils.ImageButton,
    restart_button: utils.ImageButton,
    generating_indicator: HTMLElement,
    progress_bar: HTMLInputElement,
    progress_text: HTMLElement,

    playing_verse_index: number | null,
    verses_elements: HTMLLIElement[],

    is_setting_time: boolean
}

let AUDIO_PLAYER_DATA: AudioPlayerData | null = null;

const PLAYER = new utils.tts.TtsPlayer(async e => {
    if(!AUDIO_PLAYER_DATA) return;

    if(e.type === 'ready')
    {
        update_progress_visual(0.0, await PLAYER.get_duration());

        AUDIO_PLAYER_DATA.play_button.button.classList.remove('hidden');
        AUDIO_PLAYER_DATA.generating_indicator.classList.add('hidden');

        let settings = await PLAYER.get_settings();
        if(settings.player_state === 'continuous')
        {
            await utils.sleep(100); // no idea why this works...
            AUDIO_PLAYER_DATA.play_button.button.click();
        }
    }
    if(e.type === 'generating')
    {
        update_generation_progress(0);
        AUDIO_PLAYER_DATA.play_button.button.classList.add('hidden');
        AUDIO_PLAYER_DATA.generating_indicator.classList.remove('hidden');
    }
    if(e.type === 'generation_progress')
    {
        let event_data = e.data as TtsGenerationProgressEvent;
        update_generation_progress(event_data.progress);
    }
    if(e.type === 'playing')
    {
        let event_data = e.data as TtsPlayingEvent;

        if(!AUDIO_PLAYER_DATA.is_setting_time)
        {
            update_progress_visual(event_data.elapsed, event_data.duration);
            utils.update_sliders();
        }

        if(AUDIO_PLAYER_DATA.playing_verse_index !== event_data.verse_index)
        {
            AUDIO_PLAYER_DATA.playing_verse_index = event_data.verse_index;
            update_current_reading_verse_visual();
        }
    }
    if(e.type === 'finished')
    {
        AUDIO_PLAYER_DATA.play_button.image.src = PLAY_IMAGE_SRC;
        AUDIO_PLAYER_DATA.progress_bar.value = `${1.0}`;
        utils.update_sliders();

        let settings = await PLAYER.get_settings();
        if(settings.player_state === 'continuous')
        {
            bible.to_next_chapter().then(_ => {
                view_states.goto_current_view_state();
            });
        }
        else if(settings.player_state === 'repeat')
        {
            await utils.sleep(100); // no idea why this works...
            AUDIO_PLAYER_DATA.play_button.button.click();
        }
    }

    update_playback_controls_opacity(e);
    ON_PLAYER_EVENT.invoke(e);
});

export const ON_PLAYER_VISIBILITY_CHANGED = new utils.events.EventHandler<boolean>();
export const ON_PLAYER_EVENT = new utils.events.EventHandler<TtsFrontendEvent>();

export async function show_player()
{
    if(!AUDIO_PLAYER_DATA) return;

    AUDIO_PLAYER_DATA.popup.classList.remove('hidden');
    let chapter = await bible.get_chapter() ?? { book: 0, number: 0 };
    let bible_name = await bible.get_current_bible_version();

    update_player_data_storage();

    PLAYER.request({
        bible_name,
        chapter
    });

    ON_PLAYER_VISIBILITY_CHANGED.invoke(true);
}

export function hide_player()
{
    if(!AUDIO_PLAYER_DATA) return;
    
    AUDIO_PLAYER_DATA.popup.classList.add('hidden');
    PLAYER.stop();
    AUDIO_PLAYER_DATA.play_button.image.src = "../images/light-play.svg";
    clear_current_reading_verse();
    update_player_data_storage();

    ON_PLAYER_VISIBILITY_CHANGED.invoke(false);
}

export function is_player_hidden(): boolean
{
    if(!AUDIO_PLAYER_DATA) return false;

    return AUDIO_PLAYER_DATA.popup.classList.contains('hidden');
}

export function on_passage_render()
{
    let passage_content = document.getElementById('chapter-text-content');
    if (!passage_content || !AUDIO_PLAYER_DATA) return;

    AUDIO_PLAYER_DATA.verses_elements = passage_content.querySelectorAll('li')
        .values()
        .toArray() as HTMLLIElement[];

    update_current_reading_verse_visual();
}

export const SKIP_TIME: number = 10; // 10 seconds

export function init_player()
{
    let close_button = utils.spawn_image_button(CLOSE_IMAGE_SRC);
    close_button.button.title = 'Close';

    let play_button = spawn_play_button();
    let rewind_button = spawn_rewind_button();
    let fast_forward_button = spawn_fast_forward_button();
    let restart_button = spawn_restart_button();

    let generating_indicator = spawn_generating_indicator();

    let progress_bar = utils.spawn_element('input', [], audio_range => {
        audio_range.type = 'range';
        audio_range.min = '0';
        audio_range.max = '1';
        audio_range.value = '0';
        audio_range.step = '0.001';

        audio_range.addEventListener('mousedown', e => {
            if(!AUDIO_PLAYER_DATA) return;

            e.stopPropagation();
            AUDIO_PLAYER_DATA.is_setting_time = true;
        });

        audio_range.addEventListener('change', e => {
            if(!AUDIO_PLAYER_DATA) return;
            PLAYER.set_time(+audio_range.value);
            AUDIO_PLAYER_DATA.is_setting_time = false;
        })

        audio_range.addEventListener('input', async e => {
            update_progress_visual(+audio_range.value, await PLAYER.get_duration())
        })
    });

    let progress_text = utils.spawn_element('div', ['play-time'], text => {
        text.innerHTML = '--:--';
    });

    let popup = document.body.append_element_ex('div', ['audio-player', 'hidden'], player_div => {
        player_div.id = 'audio-player';
        player_div.classList.add('spawned');
        handle_dragging(player_div);

        player_div.append_element_ex('div', ['main-content'], main_content => {
            main_content.appendChild(rewind_button.button);
            main_content.appendChild(play_button.button);
            main_content.appendChild(generating_indicator);
            main_content.appendChild(fast_forward_button.button);
            main_content.appendChild(progress_bar);
            main_content.appendChild(progress_text);
            main_content.appendChild(restart_button.button);
            main_content.appendChild(close_button.button);
        });

        let hidden_content = player_div.append_element_ex('div', ['hidden-content'], content => {
            content.append_element_ex('div', ['slider-settings'], sliders => { 
                let volume_slider = spawn_volume_slider();
                let playback_slider = spawn_playback_slider();
                
                sliders.appendChild(volume_slider);
                sliders.appendChild(playback_slider);
            });

            // TODO: Hidden
            content.append_element_ex('div', ['strategy-settings'], async strategy_settings => {
                let selector = await spawn_behavior_selector();
                strategy_settings.appendChild(selector);
            });
        });

        player_div.append_element_ex('div', ['dropdown-button'], button => {
            button.title = 'Show advanced options';

            let container = button.append_element_ex('div', ['image-container'], _ => {});

            let image = container.append_element('img', img => {
                img.src = OPEN_DROPDOWN_IMAGE_SRC;
            });

            button.addEventListener('click', e => {
                let is_active = hidden_content.classList.toggle('active');
                if(is_active)
                {
                    image.src = CLOSE_DROPDOWN_IMAGE_SRC;
                }
                else 
                {
                    image.src = OPEN_DROPDOWN_IMAGE_SRC;
                }

                update_player_data_storage();
            });
        });
    });

    close_button.button.addEventListener('click', e => {
        hide_player()
    });
    
    utils.init_sliders();

    AUDIO_PLAYER_DATA = {
        popup,
        play_button,
        close_button,
        fast_forward_button,
        rewind_button,
        restart_button,
        progress_bar,
        progress_text,
        generating_indicator,
        is_setting_time: false,
        playing_verse_index: null,
        verses_elements: []
    }

    let dropdown_button = popup.querySelector('.dropdown-button') as HTMLElement;

    let data = PLAYER_DATA_STORAGE.get();
    if(data !== null)
    {
        if(data.left !== null || data.top !== null)
        {
            popup.classList.remove('spawned');
        }

        if(data.left !== null)
        {
            popup.style.left = data.left.toString() + 'px';
        }

        if(data.top !== null)
        {
            popup.style.top = data.top.toString() + 'px';
        }

        if(data.is_open)
        {
            show_player();
        }

        if(data.is_expanded)
        {
            dropdown_button.click();
        }
    }
}

function update_player_data_storage()
{
    if(!AUDIO_PLAYER_DATA) return;

    let hidden_content = AUDIO_PLAYER_DATA.popup.querySelector('.hidden-content') as HTMLElement;

    let top_str = AUDIO_PLAYER_DATA.popup.style.top;
    let top = null;
    if(top_str.length > 0)
    {
        top = +top_str.substring(0, top_str.length - 2); // gets rid of px
    }

    let left_str = AUDIO_PLAYER_DATA.popup.style.left;
    let left = null;
    if(left_str.length > 0)
    {
        left = +left_str.substring(0, left_str.length - 2); // gets rid of px
    }

    let data = {
        top,
        left,
        is_open: !AUDIO_PLAYER_DATA.popup.classList.contains('hidden'),
        is_expanded: hidden_content.classList.contains('active'),
    }

    PLAYER_DATA_STORAGE.set(data);
}

function spawn_volume_slider(): HTMLElement
{
    let slider = spawn_settings_slider(VOLUME_IMAGE_SRC, {
        default: 1.0,
    }, 
    (input, button) => {
        if(+input.value === 0)
        {
            input.value = '1';
        }
        else 
        {
            input.value = '0';
        }

        update_volume_slider_image(+input.value, button.image);
        utils.update_sliders();

        PLAYER.get_settings().then(settings => {
            settings.volume = +input.value;
            PLAYER.set_settings(settings);
        });
    },
    (input, button) => {
        update_volume_slider_image(+input.value, button.image);

        PLAYER.get_settings().then(settings => {
            settings.volume = +input.value;
            PLAYER.set_settings(settings);
        });
    });

    PLAYER.get_settings().then(settings => {
        let e = slider.querySelector('input[type=range]') as HTMLInputElement;
        let image = slider.querySelector('img') as HTMLImageElement;
        
        e.value = settings.volume.toString();
        update_volume_slider_image(+e.value, image);
    });

    slider.title = 'Change the volume';

    return slider;
}

function update_volume_slider_image(value: number, image: HTMLImageElement)
{
    if(value == 0)
    {
        image.src = utils.images.VOLUME_MUTE;
    }
    else if (value < 0.3)
    {
        image.src = utils.images.VOLUME_LOW;
    }
    else if (value < 0.6)
    {
        image.src = utils.images.VOLUME_MID;
    }
    else 
    {
        image.src = utils.images.VOLUME_HIGH;
    }
}

function spawn_playback_slider(): HTMLElement
{
    let slider = spawn_settings_slider(PLAYBACK_SPEED_SRC, {
        default: 0.5,
        on_input: v => {
            v = Math.lerp(-1, 1, v);
            v = v + Math.sign(v);

            if (Math.abs(v) == 0) 
                v = 1;

            v = Math.abs(Math.pow(v, Math.sign(v)));

            PLAYER.get_settings().then(settings => {
                settings.playback_speed = v;
                PLAYER.set_settings(settings);
            });
        }
    }, 
    (input, button) => {
        input.value = '0.5';
        update_playback_slider_image(+input.value, button.image)
        utils.update_sliders();

        let v = +input.value;
        v = Math.lerp(-1, 1, v);
        v = v + Math.sign(v);

        if (Math.abs(v) == 0) 
            v = 1;

        v = Math.abs(Math.pow(v, Math.sign(v)));

        PLAYER.get_settings().then(settings => {
            settings.playback_speed = v;
            PLAYER.set_settings(settings);
        });
    },
    (input, button) => {
        update_playback_slider_image(+input.value, button.image);
    });

    PLAYER.get_settings().then(settings => {
        let loaded = settings.playback_speed;
        let processed = 0.5;
        if(loaded <= 1 && loaded >= 0)
        {
            processed = -1 / (2 * loaded) + 1;
        }
        else if(loaded >= 1 && loaded <= 2)
        {
            processed = loaded / 2;
        }
        let e = slider.querySelector('input[type=range]') as HTMLInputElement;
        let image = slider.querySelector('img') as HTMLImageElement;
        
        e.value = processed.toString();
        update_playback_slider_image(+e.value, image);
    });

    

    slider.title = 'Change the playback rate';

    return slider;
}

function update_playback_slider_image(value: number, image: HTMLImageElement)
{
    if (value < 0.2)
    {
        image.src = utils.images.GAUGE_MIN;
    }
    else if (value < 0.4)
    {
        image.src = utils.images.GAUGE_LOW;
    }
    else if (value <= 0.6)
    {
        image.src = utils.images.GAUGE_MID;
    }
    else if (value < 0.8)
    {
        image.src = utils.images.GAUGE_HIGH;
    }
    else 
    {
        image.src = utils.images.GAUGE_MAX;
    }
}

function spawn_settings_slider(image_src: string, args: utils.SliderArgs, on_click: (e: HTMLInputElement, image: utils.ImageButton) => void, on_input: (input: HTMLInputElement, button: utils.ImageButton) => void): HTMLElement
{
    return utils.spawn_element('div', ['setting-slider'], root => {        
        let input = utils.spawn_slider(args);
        
        input.addEventListener('mousedown', e => e.stopPropagation()); // makes sure we don't drag while modifying slider

        let button = utils.spawn_image_button(image_src, (_, button) => on_click(input, button));

        input.addEventListener('input', e => {
            on_input(input, button);
        })

        root.appendChild(button.button);
        root.appendChild(input);
    });
}

function update_current_reading_verse_visual()
{
    if(!AUDIO_PLAYER_DATA) return;
    clear_current_reading_verse();
    if(AUDIO_PLAYER_DATA.playing_verse_index !== null && AUDIO_PLAYER_DATA.verses_elements.length > AUDIO_PLAYER_DATA.playing_verse_index)
    {
        let verse_element = AUDIO_PLAYER_DATA.verses_elements[AUDIO_PLAYER_DATA.playing_verse_index];
        verse_element.classList.add('reading');
        verse_element.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}

function clear_current_reading_verse()
{
    if(!AUDIO_PLAYER_DATA) return;
    AUDIO_PLAYER_DATA.verses_elements.forEach(v => v.classList.remove('reading'));
}

function update_progress_visual(progress: number, duration: number)
{
    if(!AUDIO_PLAYER_DATA) return;

    let elapsed = progress * duration;
    let remaining = duration - elapsed;

    AUDIO_PLAYER_DATA.progress_bar.value = progress.toString();

    let mins = Math.floor(remaining / 60);
    let secs = Math.floor(remaining - (mins * 60))

    AUDIO_PLAYER_DATA.progress_text.innerHTML = mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
    utils.update_sliders();
}

function spawn_generating_indicator(): HTMLElement
{
    return utils.spawn_element('div', ['generating-indicator', 'hidden'], e => {
        e.id = 'generation-indicator';
        e.title = 'Generating audio...';
        let progress_indicator = `
            <svg viewBox="0 0 100 100">
                <circle class="circle-bg" cx="50" cy="50" r="45"></circle>
                <circle class="circle-progress" cx="50" cy="50" r="45"></circle>
            </svg>`;

        e.innerHTML = progress_indicator;
    })
}

function update_generation_progress(progress: number)
{
    if(!AUDIO_PLAYER_DATA) return;

    let indicator = AUDIO_PLAYER_DATA.generating_indicator.querySelector('.circle-progress') as HTMLElement;

    let radius = 45;
    let circumference = 2 * Math.PI * radius;
    const offset = circumference - progress * circumference;
    indicator.style.strokeDasharray = circumference.toString();
    indicator.style.strokeDashoffset = offset.toString();
}

function spawn_play_button(): utils.ImageButton
{
    let play_button = utils.spawn_image_button(PLAY_IMAGE_SRC, e => {
        e.stopPropagation();
    });

    play_button.button.title = 'Play'

    play_button.button.addEventListener('click', async e => {
        if(await PLAYER.is_playing())
        {
            PLAYER.pause();
            play_button.image.src = PLAY_IMAGE_SRC;
            play_button.button.title = 'Play';
        }
        else 
        {
            PLAYER.play();
            play_button.image.src = PAUSE_IMAGE_SRC;
            play_button.button.title = 'Pause';
        }
    });

    return play_button;
}

function update_playback_controls_opacity(event: utils.tts.TtsFrontendEvent)
{
    if(!AUDIO_PLAYER_DATA) return;

    if (PLAYER.is_ready())
    {
        AUDIO_PLAYER_DATA.fast_forward_button.button.classList.remove('inactive');
        AUDIO_PLAYER_DATA.rewind_button.button.classList.remove('inactive');
        AUDIO_PLAYER_DATA.restart_button.button.classList.remove('inactive');
    }
    else 
    {
        AUDIO_PLAYER_DATA.fast_forward_button.button.classList.add('inactive');
        AUDIO_PLAYER_DATA.rewind_button.button.classList.add('inactive');
        AUDIO_PLAYER_DATA.restart_button.button.classList.add('inactive');
    }
}

function spawn_rewind_button(): utils.ImageButton
{
    let button = utils.spawn_image_button(utils.images.ANGLES_LEFT, async e => {
        if(!AUDIO_PLAYER_DATA || !PLAYER.is_ready()) return;

        let time = +AUDIO_PLAYER_DATA.progress_bar.value;
        let duration = await PLAYER.get_duration();
        let offset_percent = SKIP_TIME / duration;
        time = Math.clamp(0.0, 1.0, time - offset_percent);
        await PLAYER.set_time(time);
        
        update_progress_visual(time, duration);
    });

    button.button.title = `Rewind ${SKIP_TIME}s`;
    return button;
}

function spawn_fast_forward_button(): utils.ImageButton
{
    let button = utils.spawn_image_button(utils.images.ANGLES_RIGHT, async e => {
        if(!AUDIO_PLAYER_DATA || !PLAYER.is_ready()) return;

        let time = +AUDIO_PLAYER_DATA.progress_bar.value;
        let duration = await PLAYER.get_duration();
        let offset_percent = SKIP_TIME / duration;
        time = Math.clamp(0.0, 1.0, time + offset_percent);
        await PLAYER.set_time(time);

        update_progress_visual(time, duration);
    });

    button.button.title = `Fast Forward ${SKIP_TIME}s`;
    return button;
}

function spawn_restart_button(): utils.ImageButton
{
    let button = utils.spawn_image_button(utils.images.ARROWS_ROTATE, async _ => {
        if(!AUDIO_PLAYER_DATA || !PLAYER.is_ready()) return;

        await PLAYER.set_time(0.0);
        update_progress_visual(0.0, await PLAYER.get_duration());

        if(PLAYER.is_finished())
        {
            // If we are finished, and need to restart, we just hit the play button
            // Quick and dirty way to make this work
            AUDIO_PLAYER_DATA.play_button.button.click();
        }
    });

    button.button.title = 'Restart';
    return button;
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
        update_player_data_storage();
    })
}