import * as utils from "../utils/index.js";
import { init_settings_page_header } from "./menu_header.js";
import * as pages from "./pages.js";
import * as settings from "../settings.js";
import * as popup from "../popups/confirm_popup.js";
import * as view_states from "../view_states.js";

export type SettingsPageData = {
    old_path: string,
}

export async function run()
{
    let data = utils.decode_from_url(window.location.href) as SettingsPageData;
    init_settings_page_header(() => '');
    pages.init_back_button(data.old_path);
    pages.init_settings_buttons(data.old_path);
    settings.init_less_sync();
    
    await sync_display_settings();

    init_clear_history_button();
    init_open_save_path();

    Promise.all([
        init_volume(),
        init_ui_scale(),
        init_font_dropdown(),
    ]).then(_ => {
        utils.init_sliders();
    });

    init_apply_buttons();
    

    document.body.style.visibility = 'visible';
}

let d_volume: number = 0;
let d_ui_scale: number = 0;
let d_font: string | null = null;

let callbacks: (() => Promise<void>)[] = []

async function sync_display_settings()
{
    d_volume = await settings.get_volume();
    d_ui_scale = await settings.get_ui_scale();
    d_font = await settings.get_font();
}

function init_apply_buttons()
{
    let sync = () => sync_display_settings().then(_ => {
        Promise.all(callbacks.map(f => f())).then(() => {
            utils.update_sliders();
        });
    });

    document.getElementById('apply-btn')?.addEventListener('click', e => {
        settings.set_settings({
            volume: d_volume,
            ui_scale: d_ui_scale,
            font: d_font,
        }).then(_ => {
            sync();
        });
    });

    document.getElementById('cancel-btn')?.addEventListener('click', e => {
        sync();
    });

    document.getElementById('reset-btn')?.addEventListener('click', e => {
        popup.show_confirm_popup({
            message: 'Do you want to reset all settings?',
            on_confirm: () => {
                settings.reset_settings().then(_ => {
                    sync();
                });
            }
        });
    })
}

async function init_volume()
{
    let slider = document.getElementById('volume-slider') as HTMLInputElement | null;
    let button = document.getElementById('mute-btn');
    let image = button?.children[0] as HTMLImageElement | undefined;
    let display = document.getElementById('volume-value-display');

    if (!slider || !button || !image || !display) return null;

    const on_value_changed = async (value: number) => {

        display.innerHTML = `${Math.round(value * 100)}%`;

        let setting_value = await settings.get_volume();
        if(setting_value != value)
            display.innerHTML += '*';

        d_volume = value;
        slider.value = value.toString()

        if (value <= 0.0)
        {
            image.src = '../images/volume/light-volume-xmark.svg';
        }
        else if (value <= 0.33)
        {
            image.src = '../images/volume/light-volume-low.svg';
        }
        else if (value <= 0.66)
        {
            image.src = '../images/volume/light-volume.svg';
        }
        else 
        {
            image.src = '../images/volume/light-volume-high.svg';
        }

        utils.update_sliders();
    }

    slider.addEventListener('input', () => on_value_changed(+slider.value));

    button.addEventListener('click', e => {
        if(+slider.value > 0)
        {
            slider.value = '0';
        }
        else 
        {
            slider.value = '0.5';
        }
        on_value_changed(+slider.value);
    })
    

    await on_value_changed(d_volume);
    
    callbacks.push(() => on_value_changed(d_volume));
}

async function init_ui_scale()
{
    let slider = document.getElementById('ui-slider')  as HTMLInputElement | null;
    let button = document.getElementById('ui-btn');
    let display = document.getElementById('ui-scale-display');

    if (!slider || !button || !display) return null;

    const on_value_changed = async (value: number) => {
        display.innerHTML = `${Math.round(value * 100)}%`;

        let setting_value = await settings.get_ui_scale();
        if(setting_value != value)
            display.innerHTML += '*';

        d_ui_scale = value;
        slider.value = Math.inv_lerp(settings.MIN_UI_SCALE, settings.MAX_UI_SCALE, value).toString();
        utils.update_sliders();
    }

    slider.addEventListener('input', () => on_value_changed(Math.lerp(settings.MIN_UI_SCALE, settings.MAX_UI_SCALE, +slider.value)));

    button.addEventListener('click', e => {
        on_value_changed(settings.DEFAULT_UI_SCALE);
    });

    await on_value_changed(d_ui_scale);
    
    callbacks.push(() => on_value_changed(d_ui_scale));
}

async function init_font_dropdown()
{
    
    let content = document.getElementById('font-dropdown-content');
    let selected_font_name = document.getElementById('selected-font-name');

    if(!content || !selected_font_name) return;

    const FONT_OPTIONS: [string, string | null][] = [
        ['Arial (Default)', null],
        ['Times New Roman', 'roman'],
        ['Brush Script', 'brush'],
        ['Courier New', 'courier']
    ];

    let on_value_changed = async (font: string | null) => {
        let current_index = FONT_OPTIONS.findIndex(o => o[1] === font);

        if(current_index === -1)
        {
            utils.debug_print(`ERROR: unknown font ${font}`);
            return;
        }

        selected_font_name.innerHTML = FONT_OPTIONS[current_index][0];
        let settings_font = await settings.get_font();
        if(settings_font != font)
            selected_font_name.innerHTML += '*';
        content.replaceChildren();
    
        for(let i = 0; i < FONT_OPTIONS.length; i++)
        {
            content.appendElement('div', option => {
                option.classList.add('dropdown-option');
    
                if(i === current_index) 
                    option.classList.add('selected-option');
    
                option.innerHTML = FONT_OPTIONS[i][0];
                option.addEventListener('click', e => {
                    d_font = FONT_OPTIONS[i][1];
                    on_value_changed(d_font);
                })
            })
        }
    }
    
    await on_value_changed(d_font);
    callbacks.push(() => on_value_changed(d_font));
}

function init_clear_history_button()
{
    document.getElementById('clear-history')?.addEventListener('click', e => {
        popup.show_confirm_popup({
            message: 'Do you wish to delete all bible search history? (this will not delete any notes or highlights)',
            on_confirm: () => {
                view_states.clear_view_states();
            }
        })
    })
}

function init_open_save_path()
{
    document.getElementById('open-save-path')?.addEventListener('click', e => {
        utils.open_save_in_file_explorer();
    });
}