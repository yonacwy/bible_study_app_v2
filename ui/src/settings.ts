import { AppSettings } from "./bindings.js";
import { EventListeners } from "./utils/events.js";
import * as utils from "./utils/index.js"

export const MAX_UI_SCALE: number = 2;
export const MIN_UI_SCALE: number = 0.5;
export const DEFAULT_UI_SCALE: number = 1;

export const MAX_TEXT_SCALE: number = 2;
export const MIN_TEXT_SCALE: number = 0.5;
export const DEFAULT_TEXT_SCALE: number = 1;

export const ON_SETTINGS_CHANGED: EventListeners<AppSettings> = new EventListeners();

export async function get_volume(): Promise<number> 
{
    return (await get_settings()).volume;
}

export async function set_volume(volume: number): Promise<void>
{
    let settings = await get_settings();
    settings.volume = Math.clamp(0, 1, volume);
    return await set_settings(settings);
}

export async function get_ui_scale(): Promise<number> 
{
    return (await get_settings()).ui_scale;
}

export async function set_ui_scale(scale: number): Promise<void>
{
    let settings = await get_settings();
    settings.ui_scale = Math.clamp(0, 1, scale);
    return await set_settings(settings);
}

export async function get_text_scale(): Promise<number> 
{
    return (await get_settings()).text_scale;
}

export async function set_text_scale(scale: number): Promise<void>
{
    let settings = await get_settings();
    settings.text_scale = Math.clamp(0, 1, scale);
    return await set_settings(settings);
}

export async function get_settings(): Promise<AppSettings>
{
    return utils.invoke('get_settings', {}) as Promise<AppSettings>;
}

export async function set_settings(settings: AppSettings): Promise<void>
{
    let result =  await utils.invoke('set_settings', { settings: settings });
    ON_SETTINGS_CHANGED.invoke(settings);
    return result;
}

export async function reset_settings()
{
    let result = await utils.invoke('set_settings', { settings: null });
    ON_SETTINGS_CHANGED.invoke(await get_settings());
    return result;
}