import { ChapterIndex, ReferenceLocation, VerseRange } from "../bindings.js";
import * as utils from "../utils/index.js";
import * as reader from "../bible_reader.js";
import { EventHandler } from "../utils/events.js";

type BehaviorType = 'single' | 'section' | 'reading' | 'continuous';
type RepeatBehavior = 'once' | 'x' | 'timed' | 'infinite';

const TYPE_CHANGED = new EventHandler<BehaviorType>();
const REPEAT_CHANGED = new EventHandler<RepeatBehavior>();
const MONTH_CHANGED = new EventHandler<number>();
const DAY_CHANGED = new EventHandler<number>();

type BehaviorSelectorData = {
    type_selector: utils.TextDropdown,
    repeat_selector: utils.ImageDropdown,
    continuous_repeat_selector: utils.ImageDropdown,

    month_selector: utils.TextDropdown,
    day_selector: utils.TextDropdown,
}

let continuous_repeat_value: RepeatBehavior = 'infinite';
let current_behavior: reader.ReaderBehavior = {
    type: 'segment',
    data: {
        start: { book: 0, number: 0 },
        length: 1,
        options: {
            type: 'no_repeat',
            data: null
        }
    }
}

export function spawn_behavior_selector(): HTMLElement
{
    let type_selector = spawn_behavior_type_selector();
    let repeat_selector = spawn_repeat_selector();
    let continuous_repeat_selector = spawn_continuous_repeat_selector();

    let month_selector = spawn_month_selector();
    let day_selector = spawn_day_selector(0, 0);

    let time_selector = spawn_time_selector();

    let count_selector = spawn_repeat_count_selector();

    TYPE_CHANGED.add_listener(v => {
        if(v === 'continuous')
        {
            continuous_repeat_selector.root.classList.remove('hidden');
            repeat_selector.root.classList.add('hidden');
            month_selector.root.classList.add('hidden');
            day_selector.root.classList.add('hidden');
        }
        else if(v === 'reading')
        {
            continuous_repeat_selector.root.classList.add('hidden');
            repeat_selector.root.classList.remove('hidden');
            month_selector.root.classList.remove('hidden');
            day_selector.root.classList.remove('hidden');
        }
        else 
        {
            continuous_repeat_selector.root.classList.add('hidden');
            repeat_selector.root.classList.remove('hidden');
            month_selector.root.classList.add('hidden');
            day_selector.root.classList.add('hidden');
        }

        if(v === 'continuous')
        {

        }
    });
    TYPE_CHANGED.invoke('single');

    REPEAT_CHANGED.add_listener(v => {
        if(v === 'timed')
        {
            time_selector.root.classList.remove('hidden');
            count_selector.root.classList.add('hidden');
        }
        else if(v === 'x')
        {
            time_selector.root.classList.add('hidden');
            count_selector.root.classList.remove('hidden');
        }
        else 
        {
            time_selector.root.classList.add('hidden');
            count_selector.root.classList.add('hidden');
        }
    });
    REPEAT_CHANGED.invoke('once');

    
    return utils.spawn_element('div', ['behavior-selector'], b => {
        b.appendChild(type_selector.root);
        b.appendChild(month_selector.root);
        b.appendChild(day_selector.root);
        b.appendChild(repeat_selector.root);
        b.appendChild(continuous_repeat_selector.root);
        b.appendChild(time_selector.root);
        b.appendChild(count_selector.root);
    });
}

function spawn_continuous_repeat_selector(): utils.ImageDropdown
{
    return utils.spawn_image_dropdown<RepeatBehavior>({
        title_image: null,
        default_index: 1,
        on_change: (v) => {
            REPEAT_CHANGED.invoke(v);
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
}

function spawn_repeat_selector(): utils.ImageDropdown
{
    return utils.spawn_image_dropdown<RepeatBehavior>({
        tooltip: 'Repeat settings',
        title_image: null,
        default_index: 0,
        on_change: (v) => {
            REPEAT_CHANGED.invoke(v);
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
}

function spawn_behavior_type_selector(): utils.TextDropdown
{
    return utils.spawn_text_dropdown<BehaviorType>({
        title_text: null,
        tooltip: 'Behavior settings',
        default_index: 0,
        on_change: (v) => {
            TYPE_CHANGED.invoke(v);
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

function spawn_month_selector(): utils.TextDropdown
{
    return utils.spawn_text_dropdown_simple({
        default: 0,
        tooltip: 'Select month',
        on_change: v => {
            MONTH_CHANGED.invoke(v);
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
}

function spawn_day_selector(month: number, default_value: number): utils.TextDropdown
{
    let options = utils.ranges.range(0, utils.get_month_length(month, true)).map(v => v.toString()).toArray();
    let dropdown = utils.spawn_text_dropdown_simple({
        default: default_value,
        on_change: v => {
            DAY_CHANGED.invoke(v);
        },
        tooltip: 'Select Day',
        options,
    });
    
    return dropdown;
}

export function spawn_time_selector(): utils.TextDropdown
{
    let options = utils.ranges.range(0, 12).map(h => {
        return utils.ranges.range(0, 4).map((m): [number, number] => [h, m]).toArray();
    }).toArray().flat()
    .map((v): utils.TextDropdownOption<number> => {
        let hour = v[0];
        let min = v[1] * 15;
        let value = hour * 60 + min;
        let text = `${hour}:${min}`;
        return {
            text,
            value,
        }
    })
    .filter(v => v.value > 0);

    options.push({
        text: `12:00`,
        value: 12 * 60  
    });

    return utils.spawn_text_dropdown({
        title_text: null,
        default_index: 0,
        options,
        tooltip: 'Select time'
    });
}

export function spawn_repeat_count_selector(): utils.TextDropdown
{
    let options = utils.ranges.range_inclusive(1, 10).map(v => v.toString()).toArray();
    return utils.spawn_text_dropdown_simple({
        default: 0,
        on_change: v => {
            DAY_CHANGED.invoke(v);
        },
        tooltip: 'Select Day',
        options,
    });
}