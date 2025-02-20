import { ChapterIndex, ReferenceLocation, VerseRange } from "../bindings.js";
import * as utils from "../utils/index.js";

const SINGLE_BEHAVIOR_IMAGE_SRC: string = '../images/audio_player/light-circle-1.svg';
const SECTION_BEHAVIOR_IMAGE_SRC: string = '../images/audio_player/light-page.svg';
const READINGS_BEHAVIOR_IMAGE_SRC: string = '../images/audio_player/light-book.svg';

export type PlayerSegment = {
    chapter_index: ChapterIndex,
    verse_range: VerseRange | null
};

export type PlayerBehaviorType = "single" | "reading" | "section";

export type BehaviorOptions = {
    repeat: "none" | "count" | "time",
    value: number | null,
};

export type PlayerBehavior = {
    type: PlayerBehaviorType,
    options: BehaviorOptions,
}

const CURRENT_BEHAVIOR: PlayerBehavior = {
    type: 'single',
    options: {
        repeat: 'none',
        value: null,
    }
}

export const ON_PLAYER_BEHAVIOR_CHANGED: utils.events.EventListeners<PlayerBehavior> = new utils.events.EventListeners<PlayerBehavior>();
export function update_behavior_changed_listeners() { ON_PLAYER_BEHAVIOR_CHANGED.invoke(CURRENT_BEHAVIOR); }

export function spawn_behavior_selector(): HTMLElement
{
    return utils.spawn_element('div', ['behavior-selector'], div => {
        let buttons: HTMLElement[] = [];

        buttons.push(utils.spawn_image_button(SINGLE_BEHAVIOR_IMAGE_SRC, e => { // single behavior
            e.stopPropagation();
            buttons.forEach(b => b.classList.remove('active'));
            buttons[0].classList.add('active');
            update_behavior_changed_listeners();
        }).button);

        buttons.push(utils.spawn_image_button(SECTION_BEHAVIOR_IMAGE_SRC, e => { // single behavior
            e.stopPropagation();
            buttons.forEach(b => b.classList.remove('active'));
            buttons[1].classList.add('active');
            ON_PLAYER_BEHAVIOR_CHANGED.invoke(CURRENT_BEHAVIOR);
        }).button);

        buttons.push(utils.spawn_image_button(READINGS_BEHAVIOR_IMAGE_SRC, e => { // single behavior
            e.stopPropagation();
            buttons.forEach(b => b.classList.remove('active'));
            buttons[2].classList.add('active');
            update_behavior_changed_listeners();
        }).button);

        buttons.forEach(b => div.appendChild(b));
        buttons[0].classList.add('active');
        update_behavior_changed_listeners();
    });
}

export function spawn_behavior_options(): HTMLElement
{
    return utils.spawn_element('div', ['behavior-options'], div => {

    });
}