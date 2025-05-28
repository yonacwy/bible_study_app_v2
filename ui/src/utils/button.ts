
export type ImageButton = {
    button: HTMLButtonElement,
    image: HTMLImageElement
}

export function spawn_image_button(image_src: string, on_click?: (e: MouseEvent, button: ImageButton) => void, parent?: HTMLElement): ImageButton
{
    let button = document.createElement('button');
    button.classList.add('image-btn');

    let image = button.append_element('img', img => {
        img.src = image_src;
    });

    if(on_click !== undefined)
        button.addEventListener('click', e => on_click(e, {
            image,
            button,
        }));

    if (parent)
    {
        parent.appendChild(button);
    }
    
    return {
        button,
        image
    };
}

export function create_image_button(parent: Element, image_src: string, on_click?: (e: MouseEvent, button: ImageButton) => void): ImageButton
{
    let button = document.createElement('button');
    button.classList.add('image-btn');

    let image = button.append_element('img', img => {
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