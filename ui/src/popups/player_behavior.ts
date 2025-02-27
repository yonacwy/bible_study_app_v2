import { ChapterIndex, ReferenceLocation, VerseRange } from "../bindings.js";
import * as utils from "../utils/index.js";
import * as reader from "../bible_reader.js";
import { EventHandler } from "../utils/events.js";
import * as bible from "../bible.js";
import * as readings from "../page_scripts/daily_readings_page.js";
import { ON_SETTINGS_CHANGED } from "../settings.js";

type BehaviorType = 'single' | 'section' | 'reading' | 'continuous';

const BEHAVIOR_SETTINGS_CHANGED: EventHandler<void> = new EventHandler();

type BehaviorSelectorData = {
    type_selector: utils.TextDropdown<BehaviorType>,
    repeat_selector: utils.ImageDropdown<reader.RepeatOptionsType>,
    continuous_repeat_selector: utils.ImageDropdown<reader.RepeatOptionsType>,

    reading_selector: ReadingsSelectorData,

    time_selector: utils.TextDropdown<number>,
    count_selector: utils.TextDropdown<number>,
    
    section_selector: SectionSelectorData,
}

reader.listen_bible_reader_event(e => {
    if(e.payload.type === 'behavior_changed')
    {
        let behavior = e.payload.data as reader.BehaviorChangedEvent;
    }
})

export async function spawn_behavior_selector(): Promise<HTMLElement>
{
    let type_selector = spawn_behavior_type_selector();
    let repeat_selector = spawn_repeat_selector();
    let continuous_repeat_selector = spawn_continuous_repeat_selector();

    let reading_selector = spawn_readings_selector();

    let time_selector = spawn_time_selector();

    let count_selector = spawn_repeat_count_selector();

    let section_selector = await spawn_section_selector();

    let data: BehaviorSelectorData = {
        type_selector,
        repeat_selector,
        continuous_repeat_selector,
        reading_selector,
        time_selector,
        count_selector,
        section_selector,
    };

    BEHAVIOR_SETTINGS_CHANGED.add_listener(_ => {
        on_behavior_changed(data);
        update_backend_behavior(data);
    });
    BEHAVIOR_SETTINGS_CHANGED.invoke();

    
    return utils.spawn_element('div', ['behavior-selector'], b => {

        b.appendElementEx('div', ['main-strats'], m => {
            m.appendChild(type_selector.root);
            m.appendChild(repeat_selector.root);
        
            m.appendChild(continuous_repeat_selector.root);
            m.appendChild(time_selector.root);
            m.appendChild(count_selector.root);
        });

        b.appendElementEx('div', ['second-strats'], s => {
            s.appendChild(reading_selector.root);
            s.appendChild(section_selector.root);
        });
    });
}

function on_behavior_changed(data: BehaviorSelectorData)
{
    let behavior_type = data.type_selector.get_value().value;
    if(behavior_type === 'continuous')
    {
        data.continuous_repeat_selector.root.classList.remove('hidden');
        data.repeat_selector.root.classList.add('hidden');
        data.reading_selector.root.hide(true);
        data.section_selector.root.hide(true);
    }
    else if(behavior_type === 'reading')
    {
        data.continuous_repeat_selector.root.classList.add('hidden');
        data.repeat_selector.root.classList.remove('hidden');
        data.reading_selector.root.hide(false);
        data.section_selector.root.hide(true);
    }
    else if(behavior_type === 'section')
    {
        data.continuous_repeat_selector.root.classList.add('hidden');
        data.repeat_selector.root.classList.remove('hidden');
        data.reading_selector.root.hide(true);
        data.section_selector.root.hide(false);
    }
    else 
    {
        data.continuous_repeat_selector.root.classList.add('hidden');
        data.repeat_selector.root.classList.remove('hidden');
        data.reading_selector.root.hide(true);
        data.section_selector.root.hide(true);
    }

    let repeat_behavior = data.repeat_selector.get_value().value;
    if(behavior_type === 'continuous')
    {
        repeat_behavior = data.continuous_repeat_selector.get_value().value;
    }

    if(repeat_behavior === 'repeat_time')
    {
        data.time_selector.root.classList.remove('hidden');
        data.count_selector.root.classList.add('hidden');
    }
    else if(repeat_behavior === 'repeat_count')
    {
        data.time_selector.root.classList.add('hidden');
        data.count_selector.root.classList.remove('hidden');
    }
    else 
    {
        data.time_selector.root.classList.add('hidden');
        data.count_selector.root.classList.add('hidden');
    }
}

async function update_backend_behavior(data: BehaviorSelectorData)
{
    let behavior = get_reader_behavior(data);
    return await reader.set_behavior(await behavior);
}

async function get_reader_behavior(data: BehaviorSelectorData): Promise<reader.ReaderBehavior>
{
    let bt = data.type_selector.get_value().value;

    if(bt !== 'reading')
    {
        let segment = await get_section_behavior(data);
        return {
            type: 'segment',
            data: segment,
        }
    }
    else 
    {
        let daily = get_reading_behavior(data);
        return {
            type: 'daily',
            data: daily
        }
    }
}

async function get_section_behavior(data: BehaviorSelectorData): Promise<reader.SegmentReaderBehavior>
{
    let bt = data.type_selector.get_value().value;
    if(bt === 'section')
    {
        let start_book = data.section_selector.begin_book_selector.get_value().index;
        let start_chapter = data.section_selector.begin_chapter_selector.get_value().index;
        
        let end_book = data.section_selector.end_book_selector.get_value().index;
        let end_chapter = data.section_selector.end_chapter_selector.get_value().index;

        let start: ChapterIndex = {
            book: start_book,
            number: start_chapter,
        }

        let end: ChapterIndex = {
            book: end_book,
            number: end_chapter,
        }

        let length = bible.get_chapter_distance(await bible.load_view(), start, end) + 1;
        utils.debug_print(`length: ${length}`);
        
        return {
            start,
            length,
            options: get_repeat_options(data),
        }
    }
    else if(bt === 'continuous')
    {
        return {
            start: await bible.get_chapter() as ChapterIndex,
            length: null,
            options: get_repeat_options(data),
        }
    }
    else 
    {
        return {
            start: await bible.get_chapter() as ChapterIndex,
            length: 1,
            options: get_repeat_options(data),
        }
    }
}

function get_reading_behavior(data: BehaviorSelectorData): reader.DailyReaderBehavior 
{
    let month = data.reading_selector.month_selector.get_value().value;
    let day = data.reading_selector.day_selector.get_value().value;
    let options = get_repeat_options(data);
    return {
        month,
        day,
        options,
    }
}

function get_repeat_options(data: BehaviorSelectorData): reader.RepeatOptions
{
    let bt = data.type_selector.get_value().value;
    let rt = data.repeat_selector.get_value().value;

    if(bt === 'continuous')
    {
        rt = data.continuous_repeat_selector.get_value().value;
    }

    let repeat_value: number | null = null;
    if(rt === 'repeat_count') 
    {
        repeat_value = data.count_selector.get_value().value + 1;
    }
    else if(rt === 'repeat_time')
    {
        repeat_value = data.time_selector.get_value().value * 60; // minutes to seconds
    }
    
    return {
        type: rt,
        data: repeat_value,
    }
}

function spawn_continuous_repeat_selector(): utils.ImageDropdown<reader.RepeatOptionsType>
{
    return utils.spawn_image_dropdown<reader.RepeatOptionsType>({
        title_image: null,
        default_index: 1,
        on_change: _ => BEHAVIOR_SETTINGS_CHANGED.invoke(),
        options: [
            {
                image: utils.images.ALARM_CLOCK,
                tooltip: 'Clock',
                value: 'repeat_time'
            },
            {
                image: utils.images.INFINITY,
                tooltip: 'Repeat indefinitely',
                value: 'infinite'
            },
        ]
    });
}

function spawn_repeat_selector(): utils.ImageDropdown<reader.RepeatOptionsType>
{
    return utils.spawn_image_dropdown<reader.RepeatOptionsType>({
        tooltip: 'Repeat settings',
        title_image: null,
        default_index: 0,
        on_change: _ => BEHAVIOR_SETTINGS_CHANGED.invoke(),
        options: [
            {
                image: utils.images.CIRCLE_1,
                tooltip: 'Play once',
                value: 'no_repeat'
            },
            {
                image: utils.images.REPEAT,
                tooltip: 'Repeat X times',
                value: 'repeat_count'
            },
            {
                image: utils.images.ALARM_CLOCK,
                tooltip: 'Repeat for a Time',
                value: 'repeat_time'
            },
            {
                image: utils.images.INFINITY,
                tooltip: 'Repeat indefinitely',
                value: 'infinite'
            },
        ]
    });
}

function spawn_behavior_type_selector(): utils.TextDropdown<BehaviorType>
{
    return utils.spawn_text_dropdown<BehaviorType>({
        title_text: null,
        tooltip: 'Behavior settings',
        default_index: 0,
        on_change: _ => BEHAVIOR_SETTINGS_CHANGED.invoke(),
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

type ReadingsSelectorData = {
    root: HTMLElement,
    readings_schedule_selector: utils.TextDropdown<number>,
    month_selector: utils.TextDropdown<number>,
    day_selector: utils.TextDropdown<number>,
}

function spawn_readings_selector(): ReadingsSelectorData
{
    let readings_schedule_selector = spawn_readings_schedule_selector();
    let month_selector = spawn_month_selector();
    let day_selector = spawn_day_selector(0, 0);

    let root = utils.spawn_element('div', ['readings-selector'], b => {
        b.appendChild(readings_schedule_selector.root);
        b.appendChild(month_selector.root);
        b.appendChild(day_selector.root);
    });

    let data: ReadingsSelectorData = {
        readings_schedule_selector,
        month_selector,
        day_selector,
        root,
    };

    month_selector.on_change.add_listener(v => {
        let selector = spawn_day_selector(v.value, 0);
        data.day_selector.root.replaceWith(selector.root);
        data.day_selector = selector;
    });

    return data;
}

function spawn_readings_schedule_selector(): utils.TextDropdown<number>
{
    return utils.spawn_text_dropdown_simple({
        default: 0,
        tooltip: 'Select month',
        on_change: r => {
            readings.set_selected_reading(r.value);
            BEHAVIOR_SETTINGS_CHANGED.invoke();
        },
        options: [
            'Robert Roberts',
            'Proverbs',
            'Chronological'
        ]
    });
}

function spawn_month_selector(): utils.TextDropdown<number>
{
    return utils.spawn_text_dropdown_simple({
        default: 0,
        tooltip: 'Select month',
        on_change: _ => BEHAVIOR_SETTINGS_CHANGED.invoke(),
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

function spawn_day_selector(month: number, default_value: number): utils.TextDropdown<number>
{
    let options = utils.ranges.range(0, utils.get_month_length(month, true)).map(v => (v + 1).toString()).toArray();
    let dropdown = utils.spawn_text_dropdown_simple({
        default: default_value,
        on_change: _ => BEHAVIOR_SETTINGS_CHANGED.invoke(),
        tooltip: 'Select Day',
        options,
    });
    
    return dropdown;
}

function spawn_time_selector(): utils.TextDropdown<number>
{
    let options = utils.ranges.range(0, 12).map(h => {
        return utils.ranges.range(0, 4).map((m): [number, number] => [h, m]).toArray();
    }).toArray().flat()
    .map((v): utils.TextDropdownOption<number> => {
        let hour = v[0];
        let min = v[1] * 15;
        let value = hour * 60 + min;
        let text = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
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
        on_change: _ => BEHAVIOR_SETTINGS_CHANGED.invoke(),
        options,
        tooltip: 'Select time'
    });
}

function spawn_repeat_count_selector(): utils.TextDropdown<number>
{
    let options = utils.ranges.range_inclusive(1, 10).map(v => 'x' + v.toString()).toArray();
    return utils.spawn_text_dropdown_simple({
        default: 0,
        on_change: _ => BEHAVIOR_SETTINGS_CHANGED.invoke(),
        tooltip: 'Select Count',
        options,
    });
}

type SectionSelectorData = {
    root: HTMLElement,
    begin_book_selector: utils.TextDropdown<string>,
    begin_chapter_selector: utils.TextDropdown<number>,

    end_book_selector: utils.TextDropdown<string>,
    end_chapter_selector: utils.TextDropdown<number>,
}

async function spawn_section_selector(): Promise<SectionSelectorData>
{
    let begin_book_selector = await spawn_book_selector();
    let begin_chapter_selector = await spawn_chapter_selector(0);

    let end_book_selector = await spawn_book_selector();
    let end_chapter_selector = await spawn_chapter_selector(0);

    let root = utils.spawn_element('div', ['section-selector'], r => {
        r.appendElementEx('div', ['tag'], t => t.innerHTML = 'Start:&nbsp;');
        r.appendChild(begin_book_selector.root);
        r.appendChild(begin_chapter_selector.root);
        r.appendElementEx('div', ['tag'], t => t.innerHTML = 'End:&nbsp;');
        r.appendChild(end_book_selector.root);
        r.appendChild(end_chapter_selector.root);
    })

    let data: SectionSelectorData = {
        begin_book_selector,
        begin_chapter_selector,
        end_book_selector,
        end_chapter_selector,
        root,
    };

    begin_book_selector.on_change.add_listener(async v => {
        let selector = await spawn_chapter_selector(v.index);
        data.begin_chapter_selector.root.replaceWith(selector.root);
        data.begin_chapter_selector = selector;
    });

    end_book_selector.on_change.add_listener(async v => {
        let selector = await spawn_chapter_selector(v.index);
        data.end_chapter_selector.root.replaceWith(selector.root);
        data.end_chapter_selector = selector;
    });

    return data;
}

async function spawn_book_selector(): Promise<utils.TextDropdown<string>>
{
    let options: utils.TextDropdownOption<string>[] = (await bible.load_view()).map(v => {
        let display = bible.shorten_book_name(v.name);
        return {
            text: display,
            tooltip: `Select ${v.name}`,
            value: v.name
        };
    });
    return utils.spawn_text_dropdown<string>({
        title_text: null,
        default_index: 0,
        on_change: _ => BEHAVIOR_SETTINGS_CHANGED.invoke(),
        tooltip: 'Select Book',
        options,
    });
}

async function spawn_chapter_selector(book: number)
{
    let chapter_count = (await bible.load_view())[book].chapter_count;
    let options = utils.ranges.range(0, chapter_count).map(c => (c + 1).toString()).toArray();
    return utils.spawn_text_dropdown_simple({
        default: 0,
        on_change: _ => BEHAVIOR_SETTINGS_CHANGED.invoke(),
        tooltip: 'Select Chapter',
        options
    });
}