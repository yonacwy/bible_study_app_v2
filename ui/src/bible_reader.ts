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

export type RenderQueueData = {
    current: number,
    sections: BibleReaderSection[]
}

export async function listen_bible_reader_event(callback: (e: utils.AppEvent<BibleReaderEvent>) => void): Promise<utils.UnlistenFn>
{
    const BIBLE_READER_EVENT_NAME: string = 'bible-reader-event';
    return await utils.listen_event(BIBLE_READER_EVENT_NAME, callback);
}

export async function start_timer(): Promise<void>
{
    return await invoke_bible_reader_command('start_timer').then(_ => {});
}

export async function pause_timer(): Promise<void>
{
    return await invoke_bible_reader_command('pause_timer').then(_ => {});
}

export async function resume_timer(): Promise<void>
{
    return await invoke_bible_reader_command('resume_timer').then(_ => {});
}

export async function stop_timer(): Promise<void>
{
    return await invoke_bible_reader_command('stop_timer').then(_ => {});
}

export async function get_reading(): Promise<BibleReaderSection | null>
{
    let json = await invoke_bible_reader_command('get') as string | null;
    if (json === null)
    {
        return null;
    }

    return JSON.parse(json);
}

export async function to_next()
{
    return await invoke_bible_reader_command('to_next').then(_ => {});
}

export async function get_behavior(): Promise<ReaderBehavior> 
{
    let json = await invoke_bible_reader_command('get_behavior') as string;
    return JSON.parse(json);
}

export async function set_behavior(behavior: ReaderBehavior): Promise<void>
{
    return await invoke_bible_reader_command('set_behavior', behavior).then(_ => {});
}

export async function get_queue(radius: number): Promise<RenderQueueData>
{
    let json = await invoke_bible_reader_command('get_queue', radius) as string;
    return JSON.parse(json);
}

export async function reset_index(): Promise<void>
{
    return await invoke_bible_reader_command('reset').then(_ => {});
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