import { ChapterIndex, VerseRange } from "./bindings.js";
import * as utils from "./utils/index.js";
import * as bible from "./bible.js";
import * as dr from "./page_scripts/daily_readings_page.js"

export type RepeatOptionsType = "no_repeat" | "repeat_count" | "repeat_time" | "infinite";

export type RepeatOptions = {
    type: RepeatOptionsType,
    data: number | null
}

export type SegmentReaderBehavior = {
    start: ChapterIndex,
    length: number | null,
    options: RepeatOptions,
}

export type DailyReaderBehavior = {
    month: number,
    day: number,
    options: RepeatOptions,
}

export type SingleReaderBehavior = {
    options: RepeatOptions
}

export type ReaderBehavior = {
    type: "segment" | "daily" | "single",
    data: SegmentReaderBehavior | DailyReaderBehavior | SingleReaderBehavior
}

export type BehaviorChangedEvent = {
    behavior: ReaderBehavior
}

export type TimerTickEvent = {
    type: "timer_started" | "timer_tick" | "timer_finished",
    elapsed: number,
    duration: number,
}

export type BibleReaderSection = {
    chapter: ChapterIndex,
    verses: VerseRange | null,
}

export type TimerEvent = {
    type: 'started' | 'stopped' | 'tick',
    value: number | null,
}

const TIMER_STORAGE = new utils.storage.ValueStorage<number>('timer-value-storage')

export class PlayerBehaviorState 
{
    private timer: ReaderTimer | null = null;
    private _reading_index = new utils.storage.ValueStorage<number>('current-reader-index', 0);
    public on_behavior_changed = new utils.events.EventHandler<ReaderBehavior>();
    public on_timer_event = new utils.events.EventHandler<TimerEvent>();
    
    constructor() {
        this.on_timer_event.add_listener(e => {
            if (e.type === 'stopped')
            {
                this.timer = null;
                TIMER_STORAGE.set(null);
            }

            if(e.type === 'started')
            {
                TIMER_STORAGE.set(0);
            }

            if (e.type === 'tick')
            {
                TIMER_STORAGE.set(this.timer!.current_time);
            }
        })
    }

    public get reading_index(): number
    {
        return this._reading_index.get() as number;
    }

    public set reading_index(v: number) 
    {
        this._reading_index.set(v);
    }

    async set_behavior(behavior: ReaderBehavior): Promise<void>
    {
        this.reading_index = 0;
        this.timer?.stop(); // stop the timer without invoking the timer stopped event
        this.timer = null;
        return await utils.invoke('set_reader_behavior', { reader_behavior: behavior }).then(_ => {
            if (behavior.data.options.type === 'repeat_time')
            {
                this.start_timer();
            }
            this.on_behavior_changed.invoke(behavior);
        });
    }

    async get_behavior(): Promise<ReaderBehavior>
    {
        return await utils.invoke('get_reader_behavior', {});
    }

    async start_timer() 
    {
        this.stop_timer();
        let duration = this.get_duration_from_behavior(await this.get_behavior());
        if (duration !== null) {
            this.timer = new ReaderTimer(duration, this.on_timer_event, TIMER_STORAGE.get() ?? 0);
            this.on_timer_event.invoke({
                type: 'started',
                value: null,
            })
        }
    }

    stop_timer() 
    {
        if (this.timer !== null)
        {
            this.timer.stop();
            this.timer = null;
            this.on_timer_event.invoke({
                type: 'stopped',
                value: null,
            })
        }
    }

    pause_timer() 
    {
        this.timer?.pause();
    }

    resume_or_restart() 
    {
        if(this.timer === null || this.timer.is_finished())
        {
            this.start_timer();
        }
        
        this.timer?.play();
    }

    restart()
    {
        if(!this.timer)
        {
            this.start_timer();
        }
        else 
        {
            this.timer.reset();
        }
    }

    async get_section(index?: number): Promise<BibleReaderSection | null>
    {
        if(this.timer !== null && this.timer.is_finished())
        {
            return null;
        }

        index = index ?? this.reading_index;
        let behavior = await this.get_behavior();

        let repeat_count;
        if (behavior.data.options.type === 'no_repeat')
        {
            repeat_count = 1;
        }
        else if (behavior.data.options.type === 'repeat_count')
        {
            repeat_count = behavior.data.options.data as number;
        }
        else 
        {
            repeat_count = Number.MAX_SAFE_INTEGER;
        }
        
        if (behavior.type === 'segment')
        {
            let { start, length } = behavior.data as SegmentReaderBehavior;
            if (length === null) 
            {
                length = Number.POSITIVE_INFINITY;
            }

            if (index / length >= repeat_count)
            {
                return null;
            }

            let count = index % length;
            let view = await bible.get_bible_view();
            let chapter = bible.increment_chapter(view, start, count);
            return {
                chapter: chapter,
                verses: null,
            }
        }

        if (behavior.type === 'daily')
        {
            let { month, day } = behavior.data as DailyReaderBehavior;

            let daily_readings = await dr.get_readings(month, day);
            if (index / daily_readings.length >= repeat_count)
            {
                return null;
            }

            let reading = daily_readings[index % daily_readings.length];

            let book = await bible.get_book_index(reading.prefix, reading.book) as number; // if it returns null, we have a bigger problem
            
            let chapter: ChapterIndex = {
                book: book,
                number: reading.chapter
            }

            return {
                chapter: chapter,
                verses: reading.range,
            }
        }

        if (behavior.type === 'single')
        {
            if (index >= repeat_count)
            {
                return null;
            }

            let verse_range = await bible.get_verse_range();

            return {
                chapter: await bible.get_chapter() as ChapterIndex,
                verses: verse_range,
            }
        }

        return null;
    }

    async get_queue(radius: number): Promise<{ current: number; sections: BibleReaderSection[], offset: number }>
    {
        let queue_index = Math.min(this.reading_index, radius);
        let len = queue_index + 1 + radius;
        let offset = this.reading_index <= radius ? 0 : this.reading_index - radius - 1;

        let sections = (await Promise.all(Array.from({ length: len }, (_, i) => i + offset)
            .map((i) => this.get_section(i))))
            .filter(Boolean) as BibleReaderSection[];

        return {
            current: queue_index,
            sections,
            offset
        };
    }

    private get_duration_from_behavior(behavior: ReaderBehavior): number | null 
    {
        const options = behavior.data.options;
        if (options.type === "repeat_time") return options.data;
        return null;
    }
}

export class ReaderTimer 
{
    private interval: ReturnType<typeof setInterval> | null = null;
    private state: "playing" | "paused" | "stopped" = "playing";
    private last_time: number | null = null;

    constructor(private duration: number, private event_handler: utils.events.EventHandler<TimerEvent>, public current_time: number) 
    {
        this.start();
        this.pause();
    }

    private start() 
    {
        const TICK_TIME = 0.1;

        this.interval = setInterval(() => {
            if (this.state === "paused") return;

            if (this.last_time === null)
            {
                this.last_time = Date.now();
                return;
            }

            const now = Date.now();
            this.current_time += (now - this.last_time) / 1000;
            this.last_time = now;

            if (this.current_time < this.duration) 
            {
                this.event_handler.invoke({
                    type: 'tick',
                    value: this.current_time / this.duration
                })
            }

            if (this.current_time >= this.duration) 
            {
                this.stop();
                this.event_handler.invoke({
                    type: 'stopped',
                    value: null,
                })
            }
        }, TICK_TIME * 1000);
    }

    play() 
    {
        this.state = "playing";
    }

    pause() 
    {
        this.state = "paused";
        this.last_time = null;
    }

    stop() 
    {
        this.state = "stopped";
        this.last_time = null;
        if (this.interval) clearInterval(this.interval);
    }

    reset() 
    {
        this.current_time = 0;
    }

    get_current_time(): number
    {
        return this.current_time;
    }

    get_duration(): number
    {
        return this.duration;
    }

    is_finished(): boolean
    {
        return this.current_time >= this.duration;
    }
}

