import * as utils from "./index.js";

export function play()
{
    invoke_command('play');
}

export function pause()
{
    invoke_command('pause');
}

export function resume()
{
    invoke_command('resume');
}

export function stop()
{
    invoke_command('stop');
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
    let state_string = await invoke_command('get_state') as string;
    
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

export async function invoke_command(cmd: string): Promise<string | null>
{
    return await utils.invoke('run_tts_command', { command: cmd }) as string | null;
}