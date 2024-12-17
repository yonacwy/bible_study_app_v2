import * as utils from "../utils/index.js";
import { init_settings_page_header } from "./menu_header.js";
import * as pages from "./pages.js";
import * as settings from "../settings.js";

export type SettingsPageData = {
    old_path: string,
}

export function run()
{
    let data = utils.decode_from_url(window.location.href) as SettingsPageData;
    init_settings_page_header(() => '');
    pages.init_back_button(data.old_path);
    pages.init_settings_buttons(data.old_path);

    init_volume();
    init_ui_scale();
    init_text_scale();

    document.body.style.visibility = 'visible';
}

function init_volume()
{
    let slider = document.getElementById('volume-slider') as HTMLInputElement | null;
    let button = document.getElementById('mute-btn');
    let image = button?.children[0] as HTMLImageElement | undefined;
    let display = document.getElementById('volume-value-display');

    if (!slider || !button || !image || !display) return;

    const on_value_changed = () => {
        let value = Math.round(+slider.value * 100);
        display.innerHTML = `${value}%`;

        if (value <= 0)
        {
            image.src = '../images/volume/light-volume-xmark.svg';
        }
        else if (value <= 33)
        {
            image.src = '../images/volume/light-volume-low.svg';
        }
        else if (value <= 66)
        {
            image.src = '../images/volume/light-volume.svg';
        }
        else 
        {
            image.src = '../images/volume/light-volume-high.svg';
        }
    }

    slider.addEventListener('input', on_value_changed);

    button.addEventListener('click', e => {
        if(+slider.value > 0)
        {
            slider.value = '0';
        }
        else 
        {
            slider.value = '0.5';
        }
        on_value_changed();
    })
}

function init_ui_scale()
{
    let slider = document.getElementById('ui-slider')  as HTMLInputElement | null;
    let button = document.getElementById('ui-btn');
    let display = document.getElementById('ui-scale-display');

    if (!slider || !button || !display) return;

    slider.value = `${Math.inv_lerp(settings.MIN_UI_SCALE, settings.MAX_UI_SCALE, settings.DEFAULT_UI_SCALE)}`;
    display.innerHTML = `${settings.DEFAULT_UI_SCALE * 100}%`;

    const on_value_changed = () => {
        let value = Math.lerp(settings.MIN_UI_SCALE, settings.MAX_UI_SCALE, +slider.value);
        display.innerHTML = `${Math.round(value * 100)}%`;
    }

    slider.addEventListener('input', on_value_changed);

    button.addEventListener('click', e => {
        slider.value = `${Math.inv_lerp(settings.MIN_UI_SCALE, settings.MAX_UI_SCALE, settings.DEFAULT_UI_SCALE)}`;
        on_value_changed();
    });
}

function init_text_scale()
{
    let slider = document.getElementById('text-slider')  as HTMLInputElement | null;
    let button = document.getElementById('text-btn');
    let display = document.getElementById('text-scale-display');

    if (!slider || !button || !display) return;

    slider.value = `${Math.inv_lerp(settings.MIN_TEXT_SCALE, settings.MAX_TEXT_SCALE, settings.DEFAULT_TEXT_SCALE)}`;
    display.innerHTML = `${settings.DEFAULT_TEXT_SCALE * 100}%`;

    const on_value_changed = () => {
        let value = Math.lerp(settings.MIN_TEXT_SCALE, settings.MAX_TEXT_SCALE, +slider.value);
        display.innerHTML = `${Math.round(value * 100)}%`;
    }

    slider.addEventListener('input', on_value_changed);

    button.addEventListener('click', e => {
        slider.value = `${Math.inv_lerp(settings.MIN_TEXT_SCALE, settings.MAX_TEXT_SCALE, settings.DEFAULT_TEXT_SCALE)}`;
        on_value_changed();
    });
}