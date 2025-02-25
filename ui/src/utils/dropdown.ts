import * as utils from "./index.js";

export type ImageDropdownOption<T> = {
    image: string,
    tooltip: string,
    value: T
}

export type ImageDropdownArgs<T> = {
    title_image: string | null,
    default_index: number,
    tooltip?: string,
    on_change?: (value: T) => void,
    options: ImageDropdownOption<T>[],
    parent?: HTMLElement,
};

export type ImageDropdown = {
    root: HTMLElement,
    title: utils.ImageButton,
    options: utils.ImageButton[]
}

export function spawn_image_dropdown<T>(args: ImageDropdownArgs<T>): ImageDropdown
{
    let dropdown = utils.spawn_element('div', ['small-dropdown'], _ => {});

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

    option_buttons.forEach((button, index) => {
        button.button.addEventListener('click', e => {
            option_buttons.forEach(b => b.button.classList.remove('selected-option'));
            button.button.classList.add('selected-option');

            title_button.button.classList.remove('active');
            dropdown.classList.remove('active');
            if(args.title_image === null)
            {
                title_button.image.src = args.options[index].image;
            }

            if(args.on_change)
            {
                args.on_change(args.options[index].value);
            }
        });
    });

    dropdown.appendChild(title_button.button);
    dropdown.appendElementEx('div', ['small-dropdown-content'], content => {
        option_buttons.forEach(b => content.appendChild(b.button));
    });

    if(args.parent)
    {
        args.parent.appendChild(dropdown);
    }

    if(args.on_change)
    {
        args.on_change(args.options[args.default_index].value);
        option_buttons[args.default_index].button.classList.add('selected-option');
    }

    return {
        root: dropdown,
        title: title_button,
        options: option_buttons
    };
}

export type TextDropdownOption<T> = {
    text: string,
    tooltip?: string,
    value: T,
}

export type TextDropdownArgs<T> = {
    title_text: string | null,
    tooltip?: string,
    default_index: number,
    on_change?: (v: T, td: TextDropdown) => void,
    options: TextDropdownOption<T>[],
    parent?: HTMLElement,
}

export type TextDropdown = {
    root: HTMLElement,
    title: HTMLElement,
    options: HTMLElement[]
}

export function spawn_text_dropdown<T>(args: TextDropdownArgs<T>): TextDropdown
{
    let dropdown = utils.spawn_element('div', ['text-dropdown'], _ => {});

    let dropdown_title = utils.spawn_element('div', ['dropdown-title'], b => {
        b.innerHTML = args.title_text ?? args.options[args.default_index].text;
        b.title = args.tooltip ?? "";
        b.addEventListener('click', e => {
            dropdown.classList.toggle('active');
            b.classList.add('active');
        });
    });

    let option_buttons = args.options.map(o => {
        return utils.spawn_element('div', ['dropdown-option'], b => {
            b.innerHTML = o.text;
            b.title = o.tooltip ?? "";
        });
    });

    let text_dropdown: TextDropdown = {
        root: dropdown,
        title: dropdown_title,
        options: option_buttons,
    }

    option_buttons.forEach((b, i) => {
        b.addEventListener('click', e => {
            option_buttons.forEach(b => b.classList.remove('selected-option'));
            b.classList.add('selected-option');

            dropdown.classList.remove('active');
            dropdown_title.classList.remove('active');

            if(args.title_text === null)
            {
                dropdown_title.innerHTML = args.options[i].text;
            }

            if(args.on_change)
            {
                args.on_change(args.options[i].value, text_dropdown);
            }
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
        args.on_change(args.options[args.default_index].value, text_dropdown);
        option_buttons[args.default_index].classList.add('selected-option');
    }

    return text_dropdown;
}

export type TextDropdownBasicArgs = {
    default: number,
    options: string[],
    tooltip?: string,
    on_change?: (v: number, td: TextDropdown) => void,
    parent?: HTMLElement,
}

export function spawn_text_dropdown_simple(args: TextDropdownBasicArgs): TextDropdown
{
    let options: TextDropdownOption<number>[] = args.options.map((v, i) => ({
        text: v,
        tooltip: `Select ${v}`,
        value: i
    }));

    return spawn_text_dropdown({
        title_text: null,
        tooltip: args.tooltip,
        default_index: args.default,
        options,
        parent: args.parent,
    })
}