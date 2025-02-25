import { ChapterIndex, ReferenceLocation, VerseRange } from "../bindings.js";
import * as utils from "../utils/index.js";
import * as reader from "../bible_reader.js";

type BehaviorType = 'single' | 'section' | 'reading' | 'continuous';
type RepeatBehavior = 'once' | 'x' | 'timed' | 'infinite';

export function spawn_behavior_selector(): HTMLElement
{
    let behavior_selector_root = utils.spawn_element('div', ['behavior-selector'], _ => {});

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

    let continuous_repeat_selector = utils.spawn_image_dropdown({
        title_image: null,
        default_index: 0,
        on_change: (v) => {

        },
        options: [
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

    
    let month_selector = spawn_month_selector(behavior_selector_root, 0, 0);

    let behavior_selector = utils.spawn_text_dropdown<BehaviorType>({
        title_text: null,
        tooltip: 'Behavior settings',
        default_index: 0,
        on_change: (v) => {
            if(v === 'continuous')
            {
                continuous_repeat_selector.root.classList.remove('hidden');
                repeat_selector.root.classList.add('hidden');
            }
            else 
            {
                continuous_repeat_selector.root.classList.add('hidden');
                repeat_selector.root.classList.remove('hidden');
            }
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
}

let current_month: number = 0;
function spawn_month_selector(parent: HTMLElement, month: number, day: number): [utils.TextDropdown, utils.TextDropdown]
{
    let day_dropdown: utils.TextDropdown = spawn_day_selector(month, day);
    let month_dropdown = utils.spawn_text_dropdown_simple({
        default: 0,
        parent,
        tooltip: 'Select month',
        on_change: (v, month_dropdown) => {
           day_dropdown.root.remove()
            day_dropdown = spawn_day_selector(v, 0);
            month_dropdown.root.after(day_dropdown.root);
        },
        options: [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
        ]
    });

    month_dropdown.root.after(day_dropdown.root);

    return [day_dropdown, month_dropdown];
}

let current_day = 0;
function spawn_day_selector(month: number, default_value: number): utils.TextDropdown
{
    let options = utils.ranges.range(0, utils.get_month_length(month, true)).map(v => v.toString()).toArray();
    let dropdown = utils.spawn_text_dropdown_simple({
        default: default_value,
        tooltip: 'Select Day',
        options,
    });
    
    return dropdown;
}