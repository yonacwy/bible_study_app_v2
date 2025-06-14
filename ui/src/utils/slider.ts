import { debug_print, events, spawn_element } from "./index.js";

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

export type SliderArgs = {
    min: number,
    max: number,
    step: number,
    default: number,
    classes: string[],
    intractable?: boolean,
    parent?: HTMLElement,
    id?: string,
}

export type Slider = {
    on_input: events.EventHandler<number>,
    on_change: events.EventHandler<number>,
    element: HTMLInputElement,
    set_value: (n: number) => void,
    get_value: () => number,
}

export function spawn_slider(args: SliderArgs): Slider
{
    let slider = spawn_element('input', args.classes, slider => {
        slider.type = 'range';

        slider.style.setProperty('--min', args.min.toString());
        slider.style.setProperty('--max', args.max.toString());

        slider.min = args.min.toString();
        slider.max = args.max.toString();
        slider.step = args.step.toString();
        slider.value = Math.clamp(args.min, args.max, args.default).toString();
        slider.style.setProperty('--val', slider.value);
    });

    if (!(args.intractable ?? true))
    {
        slider.style.pointerEvents = 'none';
    }

    if (args.id !== undefined)
    {
        slider.id = args.id;
    }

    let on_input = new events.EventHandler<number>();
    let on_change = new events.EventHandler<number>();
    let current_value = args.default;

    let get_value = (): number => current_value;
    let set_value = (n: number): void => {
        current_value = n;
        slider.value = n.toString();
        slider.style.setProperty('--val', slider.value);
        on_input.invoke(n);
    }

    slider.addEventListener('input', _ => {
        current_value = +slider.value;
        slider.style.setProperty('--val', slider.value);
        on_input.invoke(current_value);
    });

    slider.addEventListener('change', _ => {
        current_value = +slider.value;
        slider.style.setProperty('--val', slider.value);
        on_change.invoke(current_value);
    });

    if (args.parent)
    {
        args.parent.appendChild(slider);
    }
    
    return {
        on_input,
        on_change,
        set_value,
        get_value,
        element: slider
    }
}