import { ChapterIndex } from "./bindings.js";
import * as utils from "./utils/index.js";

export type RepeatOptions = {
    type: "no_repeat" | "repeat_count" | "repeat_time" | "infinite",
    data?: number
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
    elapsed: number,
    duration: number,
}

export type BibleReaderEvent = {
    type: "behavior_changed" | "timer_started" | "timer_tick" | "timer_finished",
    data?: BehaviorChangedEvent | TimerTickEvent
}

async function invoke_bible_reader_command(cmd: string, args?: any): Promise<string | null>
{
    let a: string | null = null;
    if(args !== undefined)
    {
        a = JSON.stringify(args);
    }
    return await utils.invoke('run_bible_reader_command', { command: cmd, args: a }) as string | null;
}