import { debug_print } from "./index.js";

let page_sliders: HTMLInputElement[] = [];

export function init_sliders()
{
    let sliders = document.querySelectorAll('[type=range]');
    sliders.forEach(s => {
        let slider = s as HTMLInputElement;
        
        slider.style.setProperty('--val', slider.value);
        slider.addEventListener('input', e => {
            slider.style.setProperty('--val', slider.value);
        });
        page_sliders.push(slider);
    });
}

export function update_sliders()
{
    page_sliders.forEach(slider => {
        slider.style.setProperty('--val', slider.value)
    })
}