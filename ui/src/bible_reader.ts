import { ChapterIndex, VerseRange } from "./bindings.js";
import * as utils from "./utils/index.js";

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

export class ReaderState 
{
    private timer: ReaderTimer | null = null;
    private readingIndex = 0;

    constructor(
        private behavior: ReaderBehavior,
    ) {}

    set_behavior(behavior: ReaderBehavior) 
    {
        this.behavior = behavior;
        this.readingIndex = 0;
        // emit a behavior changed event
        this.stop_timer();
        // sync to backend
    }

    get_behavior(): ReaderBehavior
    {
        return this.behavior;
    }

    start_timer() 
    {
        this.stop_timer();
        const duration = this.getDurationFromBehavior(this.behavior);
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

    get_current_reading(index?: number): BibleReaderSection | null 
    {
        const idx = index ?? this.readingIndex;
        // Similar logic to Rust code to fetch BibleReaderSection
        // e.g., from bible.getView().incrementChapter() or readingsDatabase.getReadings()
        return null; // Replace with actual logic
    }

    get_queue(radius: number): { current: number; sections: BibleReaderSection[] } 
    {
        const queueIndex = Math.min(this.readingIndex, radius);
        const len = queueIndex + 1 + radius;
        const offset = this.readingIndex <= radius ? 0 : this.readingIndex - radius - 1;

        const sections = Array.from({ length: len }, (_, i) => i + offset)
            .map((i) => this.get_current_reading(i))
            .filter(Boolean) as BibleReaderSection[];

        return {
            current: queueIndex,
            sections,
        };
    }

    private getDurationFromBehavior(behavior: ReaderBehavior): number | null 
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

