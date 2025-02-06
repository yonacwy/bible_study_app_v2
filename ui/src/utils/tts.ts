import * as utils from "./index.js";

export function play()
{
    invoke_tts_command('play');
}

export function pause()
{
    invoke_tts_command('pause');
}

export function resume()
{
    invoke_tts_command('resume');
}

export function stop()
{
    invoke_tts_command('stop');
}

export async function get_duration(): Promise<number>
{
    return +(await invoke_tts_command("get_duration") as string)
}

export function set_time(time: number)
{
    invoke_tts_command("set_time", time);
}

export enum TtsState
{
    Playing,
    Pausing,
    Paused,
    WaitingToResume,
    Resuming,
    Stopping,
    Stopped,
}

export async function get_state(): Promise<TtsState>
{
    let state_string = await invoke_tts_command('get_state') as string;
    
    if (state_string === "playing")
        return TtsState.Playing;
    if (state_string === "pausing")
        return TtsState.Pausing;
    if (state_string === "paused")
        return TtsState.Paused;
    if (state_string === "waiting_to_resume")
        return TtsState.WaitingToResume;
    if (state_string === "resuming")
        return TtsState.Resuming;
    if (state_string === "stopping")
        return TtsState.Stopping;
    if (state_string === "stopped")
        return TtsState.Stopped;

    utils.debug_print(`Unknown state: ${state_string}`)
    return TtsState.Stopped;
}

async function invoke_tts_command(cmd: string, args?: any): Promise<string | null>
{
    let a: string | null = null;
    if(args !== undefined)
    {
        a = JSON.stringify(args);
    }
    return await utils.invoke('run_tts_command', { command: cmd, args: a }) as string | null;
}