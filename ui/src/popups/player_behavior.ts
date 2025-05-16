import { ChapterIndex, ReferenceLocation, VerseRange } from "../bindings.js";
import * as utils from "../utils/index.js";
import { PlayerBehaviorState, RepeatOptionsType, SegmentReaderBehavior, DailyReaderBehavior, ReaderBehavior, RepeatOptions } from "../bible_reader.js";
import { EventHandler } from "../utils/events.js";
import * as bible from "../bible.js";
import * as readings from "../page_scripts/daily_readings_page.js";
import * as queue from "./queue_display.js";
import * as player from "./audio_player.js";
import * as view_states from "../view_states.js";

type BehaviorType = 'single' | 'section' | 'reading' | 'continuous';

type BehaviorData = {
    is_queue_open: boolean,
}

const BEHAVIOR_SETTINGS_CHANGED: EventHandler<void> = new EventHandler();
const BEHAVIOR_DATA_STORAGE = new utils.storage.ValueStorage<BehaviorData>('behavior-data-storage', {
    is_queue_open: false,
});

type BehaviorSelectorData = {
    type_selector: utils.TextDropdown<BehaviorType>,
    repeat_selector: utils.TextDropdown<RepeatOptionsType>,
    continuous_repeat_selector: utils.TextDropdown<RepeatOptionsType>,

    reading_selector: ReadingsSelectorData,

    time_selector: utils.TextDropdown<number>,
    count_selector: utils.TextDropdown<number>,
    
    section_selector: SectionSelectorData,
}

export type TimerSliderData = {
    
}

export async function spawn_behavior_selector(reader: PlayerBehaviorState): Promise<HTMLElement>
{
    let current = await reader.get_behavior();
    let bt: BehaviorType = 'single';
    if(current.type === 'daily')
    {
        bt = 'reading';
    }
    else if (current.type === 'single')
    {
        bt = 'single';
    }
    else 
    {
        let data: SegmentReaderBehavior = current.data as SegmentReaderBehavior;
        if(data.length === null)
        {
            bt = 'continuous';
        }
        else 
        {
            bt = 'section';
        }
    }

    let type_selector = spawn_behavior_type_selector(bt);
    let repeat_selector = spawn_repeat_selector(current.data.options.type);
    let continuous_repeat_selector = spawn_continuous_repeat_selector(current.data.options.type);

    let reading_selector_args = null;
    if(bt === 'reading')
    {
        let reading_data = current.data as DailyReaderBehavior;
        reading_selector_args = {
            day: reading_data.day,
            month: reading_data.month
        }
    }

    let reading_selector = await spawn_readings_selector(reading_selector_args);

    let current_time = null;
    if(current.data.options.type === 'repeat_time')
        current_time = current.data.options.data as number;

    let time_selector = spawn_time_selector(current_time);

    let current_repeat_count = 1;
    if(current.data.options.type === 'repeat_count')
        current_repeat_count = current.data.options.data as number;


    let count_selector = spawn_repeat_count_selector(current_repeat_count);

    let start_chapter = await bible.get_chapter() as ChapterIndex;
    let end_chapter = start_chapter;

    if(bt === 'section')
    {
        let section_data = current.data as SegmentReaderBehavior;
        start_chapter = section_data.start;
        let length = section_data.length ?? 1;
        let view = await bible.get_bible_view();
        end_chapter = bible.expand_chapter_index(view, bible.flatten_chapter_index(view, start_chapter) + length - 1);
    }

    let section_selector = await spawn_section_selector(start_chapter, end_chapter);

    let data: BehaviorSelectorData = {
        type_selector,
        repeat_selector,
        continuous_repeat_selector,
        reading_selector,
        time_selector,
        count_selector,
        section_selector,
    };
    
    update_selector_visuals(data); // shows/hides all panels
    
    BEHAVIOR_SETTINGS_CHANGED.add_listener(async _ => {
        update_selector_visuals(data); // shows/hides all panels
        reader.set_behavior(await get_reader_behavior(data));
    })

    let open_queue_button = utils.spawn_image_button(utils.images.HISTORY_VERTICAL, e => {
        BEHAVIOR_DATA_STORAGE.update(b => {
            b.is_queue_open = true;
            return b;
        });

        spawn_queue_display();
    });

    if (BEHAVIOR_DATA_STORAGE.get()!.is_queue_open)
    {
        spawn_queue_display();
    }

    open_queue_button.button.classList.add('open-queue-button');
    
    return utils.spawn_element('div', ['behavior-selector'], b => {

        b.append_element_ex('div', ['main-strats'], m => {
            m.appendChild(type_selector.root);
            m.append_element_ex('div', ['tag'], b => b.innerHTML = 'Repeat:&nbsp;');
            m.appendChild(repeat_selector.root);
            m.appendChild(continuous_repeat_selector.root);

            m.appendChild(time_selector.root);
            m.appendChild(count_selector.root);
            m.appendChild(open_queue_button.button);
        });

        b.append_element_ex('div', ['second-strats'], s => {
            s.appendChild(reading_selector.root);
            s.appendChild(section_selector.root);
        });
    });

    function spawn_queue_display() {
        queue.show_queue_display(reader, () => {
            BEHAVIOR_DATA_STORAGE.update(b => {
                b.is_queue_open = false;
                return b;
            });
        });
    }
}

function update_selector_visuals(data: BehaviorSelectorData)
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

async function get_reader_behavior(data: BehaviorSelectorData): Promise<ReaderBehavior>
{
    let bt = data.type_selector.get_value().value;

    if(bt === 'section' || bt === 'continuous')
    {
        let segment = await get_section_behavior(data);
        return {
            type: 'segment',
            data: segment,
        }
    }
    else if (bt === 'single')
    {
        return {
            type: 'single',
            data: {
                options: get_repeat_options(data)
            }
        }
    }
    else 
    {
        let daily = get_daily_reading_behavior(data);
        return {
            type: 'daily',
            data: daily
        }
    }
}

async function get_section_behavior(data: BehaviorSelectorData): Promise<SegmentReaderBehavior>
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

        let length = bible.get_chapter_distance(await bible.get_bible_view(), start, end) + 1;
        
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

function get_daily_reading_behavior(data: BehaviorSelectorData): DailyReaderBehavior 
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

function get_repeat_options(data: BehaviorSelectorData): RepeatOptions
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

function spawn_continuous_repeat_selector(value: RepeatOptionsType): utils.TextDropdown<RepeatOptionsType>
{
    let index = 1;
    if(value === 'infinite') index = 1;
    if(value === 'repeat_time') index = 1;

    return utils.spawn_text_dropdown<RepeatOptionsType>({
        title_text: null,
        default_index: index,
        on_change: _ => BEHAVIOR_SETTINGS_CHANGED.invoke(),
        options: [
            {
                text: 'Timed',
                tooltip: 'Clock',
                value: 'repeat_time'
            },
            {
                text: 'Infinite',
                tooltip: 'Repeat indefinitely',
                value: 'infinite'
            },
        ]
    });
}

function spawn_repeat_selector(value: RepeatOptionsType): utils.TextDropdown<RepeatOptionsType>
{
    let index = 0;
    if(value === 'no_repeat') index = 0;
    if(value === 'repeat_count') index = 1;
    if(value === 'repeat_time') index = 2;
    if(value === 'infinite') index = 3;

    return utils.spawn_text_dropdown<RepeatOptionsType>({
        title_text: null,
        tooltip: 'Repeat settings',
        default_index: index,
        on_change: _ => BEHAVIOR_SETTINGS_CHANGED.invoke(),
        options: [
            {
                text: 'Once',
                tooltip: 'Play once',
                value: 'no_repeat'
            },
            {
                text: 'Count',
                tooltip: 'Repeat X times',
                value: 'repeat_count'
            },
            {
                text: 'Timed',
                tooltip: 'Repeat for a Time',
                value: 'repeat_time'
            },
            {
                text: 'Infinite',
                tooltip: 'Repeat indefinitely',
                value: 'infinite'
            },
        ]
    });
}

function spawn_behavior_type_selector(value: BehaviorType): utils.TextDropdown<BehaviorType>
{
    let index = 0;
    if(value === 'single') index = 0;
    if(value === 'section') index = 1;
    if(value === 'reading') index = 2;
    if(value === 'continuous') index = 3;

    return utils.spawn_text_dropdown<BehaviorType>({
        title_text: null,
        tooltip: 'Behavior settings',
        default_index: index,
        on_change: _ => BEHAVIOR_SETTINGS_CHANGED.invoke(),
        options: [
            {
                text: 'Chapter',
                tooltip: 'Play the current chapter',
                value: 'single'
            },
            {
                text: 'Section',
                tooltip: 'Play a range of chapters',
                value: 'section',
            },
            {
                text: 'Daily Reading',
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

type ReadingsSelectorArgs = {
    month: number,
    day: number,
}

async function spawn_readings_selector(args: ReadingsSelectorArgs | null): Promise<ReadingsSelectorData>
{
    let readings_schedule_selector = await spawn_readings_schedule_selector();
    let current_date = new Date();
    let month_selector = spawn_month_selector(args?.month ?? current_date.getMonth());
    let day_selector = spawn_day_selector(args?.month ?? current_date.getMonth(), args?.day ?? current_date.getDate() - 1);

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

async function spawn_readings_schedule_selector(): Promise<utils.TextDropdown<number>>
{
    return utils.spawn_text_dropdown_simple({
        default: await readings.get_selected_reading(),
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

function spawn_month_selector(value: number): utils.TextDropdown<number>
{
    return utils.spawn_text_dropdown_simple({
        default: value,
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

function spawn_time_selector(value: number | null): utils.TextDropdown<number>
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

    let default_index = 0;
    if(value !== null) 
        Math.round(value / 60 / 60 * 4);

    return utils.spawn_text_dropdown({
        title_text: null,
        default_index,
        on_change: _ => BEHAVIOR_SETTINGS_CHANGED.invoke(),
        options,
        tooltip: 'Select time'
    });
}

function spawn_repeat_count_selector(value: number): utils.TextDropdown<number>
{
    let default_index = Math.round(Math.clamp(1, 10, value)) - 1;
    let options = utils.ranges.range_inclusive(1, 10).map(v => 'x' + v.toString()).toArray();
    return utils.spawn_text_dropdown_simple({
        default: default_index,
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

async function spawn_section_selector(start: ChapterIndex, end: ChapterIndex): Promise<SectionSelectorData>
{
    let begin_book_selector = await spawn_book_selector(start.book);
    let begin_chapter_selector = await spawn_chapter_selector(start);

    let end_book_selector = await spawn_book_selector(end.book);
    let end_chapter_selector = await spawn_chapter_selector(end);

    let root = utils.spawn_element('div', ['section-selector'], r => {
        r.append_element_ex('div', ['tag'], t => t.innerHTML = 'Start:&nbsp;');
        r.appendChild(begin_book_selector.root);
        r.appendChild(begin_chapter_selector.root);
        r.append_element_ex('div', ['tag'], t => t.innerHTML = 'End:&nbsp;');
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
        let selector = await spawn_chapter_selector({
            book: v.index,
            number: 0,
        });
        data.begin_chapter_selector.root.replaceWith(selector.root);
        data.begin_chapter_selector = selector;
    });

    end_book_selector.on_change.add_listener(async v => {
        let selector = await spawn_chapter_selector({
            book: v.index,
            number: 0,
        });
        data.end_chapter_selector.root.replaceWith(selector.root);
        data.end_chapter_selector = selector;
    });

    return data;
}

async function spawn_book_selector(value: number): Promise<utils.TextDropdown<string>>
{
    let options: utils.TextDropdownOption<string>[] = (await bible.get_bible_view()).map(v => {
        let display = bible.shorten_book_name(v.name);
        return {
            text: display,
            tooltip: `Select ${v.name}`,
            value: v.name
        };
    });
    return utils.spawn_text_dropdown<string>({
        title_text: null,
        default_index: value,
        on_change: _ => BEHAVIOR_SETTINGS_CHANGED.invoke(),
        tooltip: 'Select Book',
        options,
    });
}

async function spawn_chapter_selector(chapter: ChapterIndex)
{
    let chapter_count = (await bible.get_bible_view())[chapter.book].chapter_count;
    let options = utils.ranges.range(0, chapter_count).map(c => (c + 1).toString()).toArray();
    return utils.spawn_text_dropdown_simple({
        default: chapter.number,
        on_change: _ => BEHAVIOR_SETTINGS_CHANGED.invoke(),
        tooltip: 'Select Chapter',
        options
    });
}