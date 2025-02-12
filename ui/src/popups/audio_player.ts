import * as utils from '../utils/index.js';
import { TtsPlayingEvent } from '../utils/tts.js';

const TEST_TEXT: string = `
    Proverbs chapter 3

    My son, forget not my law; but let thine heart keep my commandments:
For length of days, and long life, and peace, shall they add to thee.
Let not mercy and truth forsake thee: bind them about thy neck; write them upon the table of thine heart:
So shalt thou find favour and good understanding in the sight of God and man.
Trust in the LORD with all thine heart; and lean not unto thine own understanding.
In all thy ways acknowledge him, and he shall direct thy paths.
Be not wise in thine own eyes: fear the LORD, and depart from evil.
It shall be health to thy navel, and marrow to thy bones.
Honour the LORD with thy substance, and with the firstfruits of all thine increase:
So shall thy barns be filled with plenty, and thy presses shall burst out with new wine.
My son, despise not the chastening of the LORD; neither be weary of his correction:
For whom the LORD loveth he correcteth; even as a father the son [in whom] he delighteth.
Happy [is] the man [that] findeth wisdom, and the man [that] getteth understanding.
For the merchandise of it [is] better than the merchandise of silver, and the gain thereof than fine gold.
She [is] more precious than rubies: and all the things thou canst desire are not to be compared unto her.
Length of days [is] in her right hand; [and] in her left hand riches and honour.
Her ways [are] ways of pleasantness, and all her paths [are] peace.
She [is] a tree of life to them that lay hold upon her: and happy [is every one] that retaineth her.
The LORD by wisdom hath founded the earth; by understanding hath he established the heavens.
By his knowledge the depths are broken up, and the clouds drop down the dew.
My son, let not them depart from thine eyes: keep sound wisdom and discretion:
So shall they be life unto thy soul, and grace to thy neck.
Then shalt thou walk in thy way safely, and thy foot shall not stumble.
When thou liest down, thou shalt not be afraid: yea, thou shalt lie down, and thy sleep shall be sweet.
Be not afraid of sudden fear, neither of the desolation of the wicked, when it cometh.
For the LORD shall be thy confidence, and shall keep thy foot from being taken.
Withhold not good from them to whom it is due, when it is in the power of thine hand to do [it].
Say not unto thy neighbour, Go, and come again, and to morrow I will give; when thou hast it by thee.
Devise not evil against thy neighbour, seeing he dwelleth securely by thee.
Strive not with a man without cause, if he have done thee no harm.
Envy thou not the oppressor, and choose none of his ways.
For the froward [is] abomination to the LORD: but his secret [is] with the righteous.
The curse of the LORD [is] in the house of the wicked: but he blesseth the habitation of the just.
Surely he scorneth the scorners: but he giveth grace unto the lowly.
The wise shall inherit glory: but shame shall be the promotion of fools.

`

const PLAY_IMAGE_SRC: string = '../images/light-play.svg';
const PAUSE_IMAGE_SRC: string = '../images/light-pause.svg';
const CLOSE_IMAGE_SRC: string = '../images/light-xmark.svg';

type AudioPlayerData = {
    popup: HTMLElement,
    close_button: utils.ImageButton,
    play_button: utils.ImageButton,
    generating_indicator: HTMLElement,
    progress_bar: HTMLInputElement,
    progress_text: HTMLElement,
}

let AUDIO_PLAYER_DATA: AudioPlayerData | null = null;

const PLAYER = new utils.tts.TtsPlayer(e => {
    if(!AUDIO_PLAYER_DATA) return;

    if(e.type === 'ready')
    {
        AUDIO_PLAYER_DATA.play_button.button.classList.remove('hidden');
        AUDIO_PLAYER_DATA.generating_indicator.classList.add('hidden');
    }
    if(e.type === 'generating')
    {
        AUDIO_PLAYER_DATA.play_button.button.classList.add('hidden');
        AUDIO_PLAYER_DATA.generating_indicator.classList.remove('hidden');
    }
    if(e.type === 'playing')
    {
        let event_data = e.data as TtsPlayingEvent;
        update_progress_visual(event_data.elapsed, event_data.duration);
        utils.update_sliders();
    }
    if(e.type === 'finished')
    {
        AUDIO_PLAYER_DATA.play_button.image.src = PLAY_IMAGE_SRC;
        AUDIO_PLAYER_DATA.progress_bar.value = `${1.0}`;
        utils.update_sliders();
    }
});

export function show_player()
{
    if(!AUDIO_PLAYER_DATA) return;

    AUDIO_PLAYER_DATA.popup.classList.remove('hidden');
    PLAYER.request(TEST_TEXT);
}

export function hide_player()
{
    if(!AUDIO_PLAYER_DATA) return;
    
    AUDIO_PLAYER_DATA.popup.classList.add('hidden');
    PLAYER.stop();
    AUDIO_PLAYER_DATA.play_button.image.src = "../images/light-play.svg";
}

export function init_player()
{
    let close_button = utils.spawn_image_button(CLOSE_IMAGE_SRC);
    let play_button = build_play_button();
    let generating_indicator = spawn_generating_indicator();

    let progress_bar = utils.spawn_element('input', [], audio_range => {
        audio_range.type = 'range';
        audio_range.min = '0';
        audio_range.max = '1';
        audio_range.value = '0';
        audio_range.step = '0.001';

        audio_range.addEventListener('mousedown', e => {
            e.stopPropagation();
        });
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
        player_div.appendChild(close_button.button)
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
    }
}

function update_progress_visual(progress: number, duration: number)
{
    if(!AUDIO_PLAYER_DATA) return;

    let elapsed = progress * duration;
    let remaining = duration - elapsed;

    AUDIO_PLAYER_DATA.progress_bar.value = progress.toString();

    let mins = Math.floor(remaining % 60);
    let secs = Math.floor((mins * 60) - remaining)

    AUDIO_PLAYER_DATA.progress_text.innerHTML = mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0')
}

function spawn_generating_indicator(): HTMLElement
{
    return utils.spawn_element('div', ['generating-indicator', 'hidden'], e => {
        e.appendElementEx('div', ['spinner'], e => {});
    })
}

function build_play_button(): utils.ImageButton
{
    let play_button = utils.spawn_image_button('../images/light-play.svg', e => {
        e.stopPropagation();
    });

    play_button.button.addEventListener('click', async e => {

        if(await PLAYER.is_playing())
        {
            PLAYER.pause();
            play_button.image.src = '../images/light-play.svg';
        }
        else 
        {
            PLAYER.play();
            play_button.image.src = '../images/light-pause.svg';
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