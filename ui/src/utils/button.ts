
export type ImageButton = {
    button: HTMLButtonElement,
    image: HTMLImageElement,
}

export function spawn_image_button(image_src: string, on_click?: (e: MouseEvent, button: ImageButton) => void, parent?: HTMLElement): ImageButton
{
    let button = document.createElement('button');
    button.classList.add('image-btn');

    let image = button.append_element('img', [], img => {
        img.src = image_src;
    });

    if(on_click !== undefined)
    {
        button.addEventListener('click', e => on_click(e, {
            image,
            button,
        }));
    }

    if (parent)
    {
        parent.appendChild(button);
    }
    
    return {
        button,
        image
    };
}

export function spawn_image_button_args(args: {
    image: string,
    on_click?: (e: Event, button: ImageButton) => void,
    title: string,
    parent?: HTMLElement,
    classes?: string[],
}): ImageButton
{
    let button = spawn_image_button(args.image, args.on_click, args.parent);

    if (args.title !== undefined)
    {
        button.button.title = args.title;
    }

    if (args.classes !== undefined)
    {
        button.button.classList.add(...args.classes);
    }

    return button;
}

export function create_image_button(parent: Element, image_src: string, on_click?: (e: MouseEvent, button: ImageButton) => void): ImageButton
{
    let button = document.createElement('button');
    button.classList.add('image-btn');

    let image = button.append_element('img', [], img => {
        img.src = image_src;
    });

    if(on_click !== undefined)
    {
        button.addEventListener('click', e => on_click(e, {
            image,
            button,
        }));
    }


    parent.appendChild(button);
    
    return {
        button,
        image
    };
}