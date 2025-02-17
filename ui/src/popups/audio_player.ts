import * as utils from "../utils/index.js";
import * as bible from "../bible.js";
import * as settings from "../settings.js";
import { TtsGenerationProgressEvent, TtsPlayingEvent } from "../utils/tts.js";

// To implement on a page, need to call `init_player()` before anything, then whenever the passage chapter is rendered, `on_passage_rendered()` needs to be called

const PLAY_IMAGE_SRC: string = '../images/light-play.svg';
const PAUSE_IMAGE_SRC: string = '../images/light-pause.svg';
const CLOSE_IMAGE_SRC: string = '../images/light-xmark.svg';
const OPEN_DROPDOWN_IMAGE_SRC: string = '../images/light-angle-down.svg';
const CLOSE_DROPDOWN_IMAGE_SRC: string = '../images/light-angle-up.svg';

type AudioPlayerData = {
    popup: HTMLElement,
    close_button: utils.ImageButton,
    play_button: utils.ImageButton,
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
    }
});

export async function show_player()
{
    if(!AUDIO_PLAYER_DATA) return;

    AUDIO_PLAYER_DATA.popup.classList.remove('hidden');
    let chapter = await bible.get_chapter() ?? { book: 0, number: 0 };
    let bible_name = await bible.get_current_bible_version();

    PLAYER.request({
        bible_name,
        chapter
    });
}

export function hide_player()
{
    if(!AUDIO_PLAYER_DATA) return;
    
    AUDIO_PLAYER_DATA.popup.classList.add('hidden');
    PLAYER.stop();
    AUDIO_PLAYER_DATA.play_button.image.src = "../images/light-play.svg";
    clear_current_reading_verse();
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

export function init_player()
{
    let close_button = utils.spawn_image_button(CLOSE_IMAGE_SRC);
    let play_button = build_play_button();
    let generating_indicator = spawn_generating_indicator();
    let dropdown_button = build_dropdown_button();

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

    let popup = document.body.appendElementEx('div', ['audio-player', 'hidden'], player_div => {
        player_div.id = 'audio-player';
        player_div.classList.add('spawned');
        handle_dragging(player_div);
        
        player_div.appendChild(play_button.button);
        player_div.appendChild(generating_indicator);
        player_div.appendChild(progress_bar);
        player_div.appendChild(progress_text);
        player_div.appendChild(close_button.button);
    });

    close_button.button.addEventListener('click', e => {
        hide_player()
    });
    
    utils.init_sliders();

    AUDIO_PLAYER_DATA = {
        popup,
        play_button,
        close_button,
        progress_bar,
        progress_text,
        generating_indicator,
        is_setting_time: false,
        playing_verse_index: null,
        verses_elements: []
    }
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

function build_play_button(): utils.ImageButton
{
    let play_button = utils.spawn_image_button(PLAY_IMAGE_SRC, e => {
        e.stopPropagation();
    });

    play_button.button.addEventListener('click', async e => {

        if(await PLAYER.is_playing())
        {
            PLAYER.pause();
            play_button.image.src = PLAY_IMAGE_SRC;
        }
        else 
        {
            PLAYER.play();
            play_button.image.src = PAUSE_IMAGE_SRC;
        }
    });

    return play_button;
}

function build_dropdown_button(): HTMLButtonElement
{
    let dropdown_button = utils.spawn_image_button(OPEN_DROPDOWN_IMAGE_SRC, e => {
        
    })

    return dropdown_button.button;
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