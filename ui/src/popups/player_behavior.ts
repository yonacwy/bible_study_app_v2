import { ChapterIndex, ReferenceLocation, VerseRange } from "../bindings.js";
import * as utils from "../utils/index.js";

const SINGLE_BEHAVIOR_IMAGE_SRC: string = '../images/audio_player/light-circle-1.svg';
const SECTION_BEHAVIOR_IMAGE_SRC: string = '../images/audio_player/light-page.svg';
const READINGS_BEHAVIOR_IMAGE_SRC: string = '../images/audio_player/light-book.svg';

export function spawn_behavior_selector(): HTMLElement
{
    return utils.spawn_element('div', ['behavior-selector'], div => {
        let buttons: HTMLElement[] = [];

        buttons.push(utils.spawn_image_button(SINGLE_BEHAVIOR_IMAGE_SRC, e => { // single behavior
            e.stopPropagation();
            buttons.forEach(b => b.classList.remove('active'));
            buttons[0].classList.add('active');
        }).button);

        buttons.push(utils.spawn_image_button(SECTION_BEHAVIOR_IMAGE_SRC, e => { // single behavior
            e.stopPropagation();
            buttons.forEach(b => b.classList.remove('active'));
            buttons[1].classList.add('active');
        }).button);

        buttons.push(utils.spawn_image_button(READINGS_BEHAVIOR_IMAGE_SRC, e => { // single behavior
            e.stopPropagation();
            buttons.forEach(b => b.classList.remove('active'));
            buttons[2].classList.add('active');
        }).button);

        buttons.forEach(b => div.appendChild(b));
        buttons[0].classList.add('active');
    });
}