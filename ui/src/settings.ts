import { AppSettings } from "./bindings.js";
import { EventHandler } from "./utils/events.js";
import * as utils from "./utils/index.js"

export const MAX_UI_SCALE: number = 2;
export const MIN_UI_SCALE: number = 0.5;
export const DEFAULT_UI_SCALE: number = 1;

export const MAX_TEXT_SCALE: number = 2;
export const MIN_TEXT_SCALE: number = 0.5;
export const DEFAULT_TEXT_SCALE: number = 1;

export const ON_SETTINGS_CHANGED: EventHandler<AppSettings> = new EventHandler();

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

export async function get_font(): Promise<string | null>
{
    return (await get_settings()).font;
}

export async function set_font(font: string | null): Promise<void>
{
    let settings = await get_settings();
    settings.font = font;
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
    return await result;
}

export async function reset_settings()
{
    let result = await utils.invoke('set_settings', { settings: null });
    ON_SETTINGS_CHANGED.invoke(await get_settings());
    return await result;
}

export async function init_less_sync()
{
    let on_changed = (settings: AppSettings) => {

        less.modifyVars({
            '@ui-scale': `${settings.ui_scale}`,
            '@font-family': `'${settings.font ?? 'default'}'`
        });
    }

    ON_SETTINGS_CHANGED.add_listener(on_changed);
    on_changed(await get_settings());
}