import { ChapterIndex, VerseRange } from "./bindings.js";
import * as utils from "./utils/index.js";

export type RepeatOptions = {
    type: "no_repeat" | "repeat_count" | "repeat_time" | "infinite",
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
    elapsed: number,
    duration: number,
}

export type BibleReaderEvent = {
    type: "behavior_changed" | "timer_started" | "timer_tick" | "timer_finished",
    data?: BehaviorChangedEvent | TimerTickEvent
}

export type BibleReaderSection = {
    chapter: ChapterIndex,
    verses: VerseRange | null,
}

export class BibleReader 
{
    
}

export async function listen_bible_reader_event(callback: (e: utils.AppEvent<BibleReaderEvent>) => void): Promise<utils.UnlistenFn>
{
    const BIBLE_READER_EVENT_NAME: string = 'bible-reader-event';
    return await utils.listen_event(BIBLE_READER_EVENT_NAME, callback);
}

async function start_timer(): Promise<void>
{
    return await invoke_bible_reader_command('start_timer').then(_ => {});
}

async function pause_timer(): Promise<void>
{
    return await invoke_bible_reader_command('pause_timer').then(_ => {});
}

async function resume_timer(): Promise<void>
{
    return await invoke_bible_reader_command('resume_timer').then(_ => {});
}

async function stop_timer(): Promise<void>
{
    return await invoke_bible_reader_command('stop_timer').then(_ => {});
}

async function get_next(): Promise<BibleReaderSection>
{
    let json = await invoke_bible_reader_command('get_next') as string;
    return JSON.parse(json);
}

async function get_behavior(): Promise<ReaderBehavior> 
{
    let json = await invoke_bible_reader_command('get_behavior') as string;
    return JSON.parse(json);
}

async function set_behavior(behavior: ReaderBehavior): Promise<void>
{
    return await invoke_bible_reader_command('set_behavior', behavior).then(_ => {});
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