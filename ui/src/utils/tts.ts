import * as utils from "./index.js";

export async function listen_tts_event(callback: (e: utils.AppEvent<TtsEvent>) => void): Promise<utils.UnlistenFn>
{
    const TTS_EVENT_NAME: string = 'tts_event';
    return await utils.listen_event(TTS_EVENT_NAME, callback);
} 

export type TtsGeneratedEvent = {
    id: string,
}

export type TtsSetEvent = {
    id: string
}

export type TtsPlayedEvent = {
    id: string 
}

export type TtsPlayingEvent = {
    id: string,
    elapsed: number,
    duration: number,
}

export type TtsPausedEvent = {
    id: string 
}

export type TtsStoppedEvent = {
    id: string,
}

export type TtsEvent = {
    type: "generated" | "set" | "played" | "playing" | "paused" | "stopped" | "finished",
    data: TtsGeneratedEvent | TtsSetEvent | TtsPlayedEvent | TtsPlayingEvent | TtsPausedEvent | TtsStoppedEvent,
}

export type TtsFrontendEvent = {
    type: "generating" | "ready" | "playing" | "finished",
    data: TtsPlayingEvent | null,
}

export type TtsRequest = {
    id: string,
    generating: boolean
}

export class TtsPlayer
{
    private playing_id: string | null = null;
    private ready: boolean = false;
    private callback: (e: TtsFrontendEvent) => void;

    public constructor(callback: (e: TtsFrontendEvent) => void) 
    {
        this.callback = callback;
        listen_tts_event(e => this.on_event(e));
    }

    public async request(text: string)
    {
        let request = await request_tts(text);
        this.playing_id = request.id;
        this.ready = !request.generating; // if we are generating, we are not ready
        if(this.ready)
        {
            set_playing_id(this.playing_id);
        }
        else 
        {
            this.callback({
                type: "generating",
                data: null,
            });
        }
    }

    public is_ready(): boolean
    {
        return this.ready;
    }

    public async play()
    {
        if (this.ready)
        {
            return await play();
        }
        else 
        {
            utils.debug_print('error: player not ready');
        }
    }

    public async pause()
    {
        if (this.ready)
        {
            return await pause();
        }
        else 
        {
            utils.debug_print('error: player not ready');
        }
    }

    public async stop()
    {
        if (this.ready)
        {
            this.ready = false;
            this.playing_id = null;
            return await stop();
        }
        else 
        {
            utils.debug_print('error: player not ready');
        }
    }

    public async is_playing(): Promise<boolean>
    {
        return await is_playing();
    }

    private on_event(e: utils.AppEvent<TtsEvent>)
    {
        switch(e.payload.type)
        {
            case "generated": {
                let data = e.payload.data as TtsGeneratedEvent;
                // utils.debug_print(`got here, ${this.playing_id} == ${e.payload.data.id}`);
                if(data.id == this.playing_id)
                {
                    this.ready = true;
                    set_playing_id(data.id); // this will set off the 'set' event when finished
                }
                break;
            }
            case "set": {
                utils.debug_print('called');
                this.callback({
                    type: "ready",
                    data: null,
                })
                break;
            }
            case "played": {
                break;
            }
            case "playing": {
                this.callback({
                    type: 'playing',
                    data: e.payload.data as TtsPlayingEvent
                })
                break;
            }
            case "paused": {
                break;
            }
            case "stopped": {
                break;
            }
            case "finished": {
                this.callback({
                    type: 'finished',
                    data: null,
                })
                break;
            }
        }
    }
}

async function request_tts(text: string): Promise<TtsRequest> 
{
    let json = await invoke_tts_command('request', text) as string;
    return JSON.parse(json) as TtsRequest;
}

async function set_playing_id(id: string)
{
    return await invoke_tts_command('set', id);
}

async function play()
{
    return await invoke_tts_command('play');
}

async function pause()
{
    return await invoke_tts_command('pause');
}

async function stop()
{
    return await invoke_tts_command('stop');
}

async function is_playing(): Promise<boolean>
{
    let json = await invoke_tts_command('is_playing') as string;
    return JSON.parse(json)
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