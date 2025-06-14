import { ChapterIndex, Color } from "../bindings.js";
import { EventHandler } from "./events.js";
import * as utils from "./index.js";

export type DropdownValue<T> = {
    index: number,
    value: T,
}

export type ImageDropdownOption<T> = {
    image: string,
    tooltip: string,
    value: T
}

export type ToggleImageDropdownArgs<T> = {
    title_image: string | null,
    default_index: number,
    tooltip?: string,
    on_change?: (v: DropdownValue<T>) => void,
    options: ImageDropdownOption<T>[],
    parent?: HTMLElement,
    id?: string,
};

export type ToggleImageDropdown<T> = {
    root: HTMLElement,
    title: utils.ImageButton,
    options: utils.ImageButton[],
    set_value: (v: number) => void,
    get_value: () => DropdownValue<T>,
    on_change: EventHandler<DropdownValue<T>>,
}

export function spawn_toggle_image_dropdown<T>(args: ToggleImageDropdownArgs<T>): ToggleImageDropdown<T>
{
    let handler = new EventHandler<DropdownValue<T>>();
    let dropdown = utils.spawn_element('div', ['small-dropdown'], _ => {});
    dropdown.id = args.id ?? '';

    let title_image = args.title_image ?? args.options[args.default_index].image
    let title_button = utils.spawn_image_button(title_image, (_, img) => {
        img.button.classList.toggle('active');
        dropdown.classList.toggle('active');
    });

    title_button.button.title = args.tooltip ?? "";

    let option_buttons = args.options.map(o => {
        let button = utils.spawn_image_button(o.image);
        button.button.title = o.tooltip;
        return button;
    });

    let selected_index = args.default_index;
    let set_value = (index: number) =>
    {
        option_buttons.forEach(b => b.button.classList.remove('selected-option'));
        option_buttons[index].button.classList.add('selected-option');

        title_button.button.classList.remove('active');
        dropdown.classList.remove('active');
        if(args.title_image === null)
        {
            title_button.image.src = args.options[index].image;
        }

        selected_index = index;
        handler.invoke({
            value: args.options[index].value,
            index
        });
    }

    let get_value: () => DropdownValue<T> = () => ({
        value: args.options[selected_index].value, 
        index: selected_index,
    });

    option_buttons.forEach((button, index) => {
        button.button.addEventListener('click', e => {
            set_value(index);
        });
    });

    dropdown.appendChild(title_button.button);
    dropdown.append_element('div', ['small-dropdown-content'], content => {
        option_buttons.forEach(b => content.appendChild(b.button));
    });

    if(args.parent)
    {
        args.parent.appendChild(dropdown);
    }

    if(args.on_change)
    {
        handler.add_listener(args.on_change);
        option_buttons[args.default_index].button.classList.add('selected-option');
    }

    return {
        root: dropdown,
        title: title_button,
        options: option_buttons,
        set_value,
        get_value,
        on_change: handler,
    };
}

export type TextDropdownOption<T> = {
    text: string,
    tooltip?: string,
    value: T,
}

export type ToggleTextDropdownArgs<T> = {
    title_text: string | null,
    tooltip?: string,
    default_index: number,
    on_change?: (v: DropdownValue<T>) => void,
    options: TextDropdownOption<T>[],
    parent?: HTMLElement,
    id?: string,
}

export type ToggleTextDropdown<T> = {
    root: HTMLElement,
    title: HTMLElement,
    options: HTMLElement[],
    set_value: (i: number) => void,
    get_value: () => DropdownValue<T>,
    on_change: EventHandler<DropdownValue<T>>,
}

export function spawn_toggle_text_dropdown<T>(args: ToggleTextDropdownArgs<T>): ToggleTextDropdown<T>
{
    let handler = new EventHandler<DropdownValue<T>>();
    let dropdown = utils.spawn_element('div', ['text-dropdown'], _ => {});
    dropdown.id = args.id ?? '';

    let dropdown_title = utils.spawn_element('div', ['dropdown-title'], b => {
        b.innerHTML = args.title_text ?? args.options[args.default_index].text;
        b.title = args.tooltip ?? "";
        b.addEventListener('click', e => {
            dropdown.classList.toggle('active');
            b.classList.toggle('active');
        });
    });

    let option_buttons = args.options.map(o => {
        return utils.spawn_element('div', ['dropdown-option'], b => {
            b.innerHTML = o.text;
            b.title = o.tooltip ?? "";
        });
    });

    option_buttons[args.default_index].classList.add('selected-option');

    let selected_index = args.default_index;

    let set_value = (i: number) => {
        option_buttons.forEach(b => b.classList.remove('selected-option'));
        option_buttons[i].classList.add('selected-option');

        dropdown.classList.remove('active');
        dropdown_title.classList.remove('active');

        if(args.title_text === null)
        {
            dropdown_title.innerHTML = args.options[i].text;
        }

        selected_index = i;
        handler.invoke({
            value: args.options[i].value,
            index: i,
        });
    }

    let get_value: () => DropdownValue<T> = () => ({
        value: args.options[selected_index].value, 
        index: selected_index
    });

    option_buttons.forEach((b, i) => {
        b.addEventListener('click', e => {
            set_value(i);
        });
    });

    let content = utils.spawn_element('div', ['dropdown-content'], c => {
        option_buttons.forEach(b => c.appendChild(b));
    })

    dropdown.appendChild(dropdown_title);
    dropdown.appendChild(content)

    if(args.parent)
    {
        args.parent.appendChild(dropdown);
    }

    if(args.on_change)
    {
        handler.add_listener(args.on_change);
        option_buttons[args.default_index].classList.add('selected-option');
    }

    return {
        root: dropdown,
        title: dropdown_title,
        options: option_buttons,
        set_value,
        get_value,
        on_change: handler,
    };
}

export type ToggleTextDropdownBasicArgs = {
    default: number,
    options: string[],
    tooltip?: string,
    on_change?: (v: DropdownValue<number>) => void,
    parent?: HTMLElement,
    id?: string
}

export function spawn_toggle_text_dropdown_simple(args: ToggleTextDropdownBasicArgs): ToggleTextDropdown<number>
{
    let options: TextDropdownOption<number>[] = args.options.map((v, i) => ({
        text: v,
        tooltip: `Select ${v}`,
        value: i,
        id: args.id,
    }));

    return spawn_toggle_text_dropdown({
        title_text: null,
        tooltip: args.tooltip,
        default_index: args.default,
        options,
        parent: args.parent,
        on_change: args.on_change,
    });
}

export type ImageDropdownArgs<T> = {
    title_image: string,
    tooltip: string,
    options: ImageDropdownOption<T>[],
    parent: HTMLElement | null,
    id: string | null,
    is_small?: boolean, // flag if to use `dropdown` or `small-dropdown`
    is_content_small?: boolean,
}

export type ImageDropdown<T> = {
    root: HTMLElement,
    on_select: utils.events.EventHandler<DropdownValue<T>>,
}

export function spawn_image_dropdown<T>(args: ImageDropdownArgs<T>): ImageDropdown<T>
{
    let dropdown_class = args.is_small ? 'small-dropdown' : 'dropdown';
    let dropdown_content_class = args.is_content_small ? 'small-dropdown-content' : 'dropdown-content';

    let on_select = new EventHandler<DropdownValue<T>>();
    let dropdown = utils.spawn_element('div', [dropdown_class], _ => {});
    dropdown.id = args.id ?? '';

    let title_image = args.title_image;
    let title_button = utils.spawn_image_button(title_image, (_, img) => {
        img.button.classList.toggle('active');
        dropdown.classList.toggle('active');
    });

    on_select.add_listener(_ => {
        title_button.button.classList.remove('active');
        dropdown.classList.remove('active');
    })

    title_button.button.title = args.tooltip;

    let option_buttons = args.options.map(o => {
        let button = utils.spawn_image_button(o.image);
        button.button.title = o.tooltip;
        return button;
    });

    option_buttons.forEach((button, index) => {
        button.button.addEventListener('click', e => {
            on_select.invoke({
                index,
                value: args.options[index].value
            });
        });
    });

    dropdown.appendChild(title_button.button);
    dropdown.append_element('div', [dropdown_content_class], content => {
        option_buttons.forEach(b => content.appendChild(b.button));
    });

    if(args.parent)
    {
        args.parent.appendChild(dropdown);
    }

    return {
        root: dropdown,
        on_select,
    };
}