
export function create_image_button(parent: Element, image: string, on_click: (e: MouseEvent) => void): HTMLButtonElement
{
    return parent.appendElementEx('button', ['image-btn'], button => {
        button.appendElement('img', img => {
            img.src = image;
        });

        button.addEventListener('click', on_click);
    }) as HTMLButtonElement;
}