import { ChapterIndex, ReferenceLocation, VerseRange } from "../bindings.js";
import * as utils from "../utils/index.js";

type BehaviorType = 'single' | 'section' | 'reading' | 'continuous';
type RepeatBehavior = 'once' | 'x' | 'timed' | 'infinite';

export function spawn_behavior_selector(): HTMLElement
{
    let behavior_selector = utils.spawn_text_dropdown<BehaviorType>({
        title_text: null,
        tooltip: 'Behavior settings',
        default_index: 0,
        on_change: (v) => {
            utils.debug_print(`set behavior to ${v}`)
        },
        options: [
            {
                text: 'Single',
                tooltip: 'Play the current chapter',
                value: 'single'
            },
            {
                text: 'Section',
                tooltip: 'Play a range of chapters',
                value: 'section',
            },
            {
                text: 'Reading',
                tooltip: 'Play a reading',
                value: 'reading',
            },
            {
                text: 'Continuous',
                tooltip: 'Play continuously',
                value: 'continuous',
            }
        ]
    });

    let repeat_selector = utils.spawn_image_dropdown<RepeatBehavior>({
        tooltip: 'Repeat settings',
        title_image: null,
        default_index: 0,
        on_change: (v) => {
            utils.debug_print(`set value to ${v}`);
        },
        options: [
            {
                image: utils.images.CIRCLE_1,
                tooltip: 'Play once',
                value: 'once'
            },
            {
                image: utils.images.REPEAT,
                tooltip: 'Repeat X times',
                value: 'x'
            },
            {
                image: utils.images.ALARM_CLOCK,
                tooltip: 'Clock',
                value: 'timed'
            },
            {
                image: utils.images.INFINITY,
                tooltip: 'Repeat indefinitely',
                value: 'infinite'
            },
        ]
    });

    return utils.spawn_element('div', ['behavior-selector'], b => {
        b.appendChild(behavior_selector.root);
        b.appendChild(repeat_selector.root);
    })
}