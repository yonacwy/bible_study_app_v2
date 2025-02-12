
export type ImageButton = {
    button: HTMLButtonElement,
    image: HTMLImageElement
}

export function spawn_image_button(image_src: string, on_click?: (e: MouseEvent) => void): ImageButton
{
    let button = document.createElement('button');
    button.classList.add('image-btn');

    let image = button.appendElement('img', img => {
        img.src = image_src;
    });

    if(on_click !== undefined)
        button.addEventListener('click', e => on_click(e));
    
    return {
        button,
        image
    };
}

export function create_image_button(parent: Element, image_src: string, on_click?: (e: MouseEvent) => void): ImageButton
{
    let button = document.createElement('button');
    button.classList.add('image-btn');

    let image = button.appendElement('img', img => {
        img.src = image_src;
    });

    if(on_click !== undefined)
        button.addEventListener('click', e => on_click(e));

    parent.appendChild(button);
    
    return {
        button,
        image
    };
}