import { AppSettings } from "./bindings.js";
import * as utils from "./utils/index.js"

export const MAX_UI_SCALE: number = 2;
export const MIN_UI_SCALE: number = 0.5;
export const DEFAULT_UI_SCALE: number = 1;

export const MAX_TEXT_SCALE: number = 2;
export const MIN_TEXT_SCALE: number = 0.5;
export const DEFAULT_TEXT_SCALE: number = 1;

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
    return await utils.invoke('set_settings', { settings: settings });
}

export async function reset_settings()
{
    return await utils.invoke('set_settings', { settings: null });
}