
export function spawn_image_button(image: string, on_click: (e: MouseEvent) => void): HTMLButtonElement
{
    let button = document.createElement('button');
    button.classList.add('image-btn');

    button.appendElement('img', img => {
        img.src = image;
    });

    button.addEventListener('click', e => on_click(e));
    return button;
}

export function create_image_button(parent: Element, image: string, on_click: (e: MouseEvent) => void): HTMLButtonElement
{
    return parent.appendElementEx('button', ['image-btn'], button => {
        button.appendElement('img', img => {
            img.src = image;
        });

        button.addEventListener('click', on_click);
    }) as HTMLButtonElement;
}