import * as utils from "./index.js";

export type ImageDropdownOption<T> = {
    image: string,
    title: string,
    value: T
}

export type ImageDropdownArgs<T> = {
    title_image: string,
    default_index: number,
    title: string,
    on_change: (img: utils.ImageButton, value: T) => void,
    options: ImageDropdownOption<T>[],
};

export function spawn_image_dropdown<T>(args: ImageDropdownArgs<T>)
{
    
}