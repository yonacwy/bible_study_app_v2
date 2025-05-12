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

export type ReaderBehavior = {
    type: "segment" | "daily",
    data: SegmentReaderBehavior | DailyReaderBehavior
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

export class PlayerBehaviorState 
{
    private timer: ReaderTimer | null = null;
    private readingIndex = 0;
    
    constructor() {}

    async set_behavior(behavior: ReaderBehavior): Promise<void>
    {
        this.readingIndex = 0;
        // fire off behavior set event?
        this.stop_timer();
        return await utils.invoke('set_reader_behavior', { reader_behavior: behavior });
    }

    async get_behavior(): Promise<ReaderBehavior>
    {
        return await utils.invoke('get_reader_behavior', {});
    }

    async start_timer() 
    {
        this.stop_timer();
        let duration = this.get_duration_from_behavior(await this.get_behavior());
        if (duration) {
            this.timer = new ReaderTimer(duration);
        }
    }

    stop_timer() 
    {
        this.timer?.stop();
        this.timer = null;
    }

    pause_timer() 
    {
        this.timer?.pause();
    }

    resume_timer() 
    {
        this.timer?.play();
    }

    async get_section(index?: number): Promise<BibleReaderSection | null>
    {
        index = index ?? this.readingIndex;
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
            if (index / length >= repeat_count)
            {
                return null;
            }

            let daily_readings = await dr.get_readings(month, day);
            let reading = daily_readings[index % daily_readings.length];

            let book = await bible.get_book_index(reading.prefix, reading.book) as number; // if it returns null, we have a bigger problem
            
            let chapter: ChapterIndex = {
                book: book,
                number: reading.chapter
            }

            return {
                chapter: chapter,
                verses: null,
            }
        }

        return null;
    }

    async get_queue(radius: number): Promise<{ current: number; sections: BibleReaderSection[] }>
    {
        const queueIndex = Math.min(this.readingIndex, radius);
        const len = queueIndex + 1 + radius;
        const offset = this.readingIndex <= radius ? 0 : this.readingIndex - radius - 1;

        const sections = (await Promise.all(Array.from({ length: len }, (_, i) => i + offset)
            .map((i) => this.get_section(i))))
            .filter(Boolean) as BibleReaderSection[];

        return {
            current: queueIndex,
            sections,
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
    private currentTime = 0;
    private lastTick = 0;

    constructor(private duration: number) 
    {
        this.start();
    }

    private start() 
    {
        const TICK_TIME = 0.5;
        let lastTime = Date.now();

        this.interval = setInterval(() => {
            if (this.state === "paused") return;

            const now = Date.now();
            this.currentTime += (now - lastTime) / 1000;
            lastTime = now;

            if (this.currentTime - this.lastTick >= TICK_TIME) 
            {
                this.lastTick = this.currentTime;
                // emit a tick event
            }

            if (this.currentTime >= this.duration) 
            {
                this.stop();
                // emit a stop event
            }
        }, 100);
    }

    play() 
    {
        this.state = "playing";
    }

    pause() 
    {
        this.state = "paused";
    }

    stop() 
    {
        this.state = "stopped";
        if (this.interval) clearInterval(this.interval);
    }

    reset() 
    {
        this.currentTime = 0;
    }

    get_current_time(): number
    {
        return this.currentTime;
    }

    get_duration(): number
    {
        return this.duration;
    }
}

