import { color_to_hex } from "./utils.js";
export function display_on_div(div, colors, has_note, popup) {
    div.addEventListener('mouseenter', _ => {
        popup.replaceChildren();
        colors.forEach(color => {
            let child = document.createElement('div');
            child.classList.add('color-square');
            child.style.backgroundColor = color_to_hex(color);
            popup.appendChild(child);
        });
        if (has_note) {
            let img = document.createElement('img');
            img.src = '../images/light-note.svg';
            let div = document.createElement('div');
            div.classList.add('img-square');
            div.appendChild(img);
            popup.appendChild(div);
        }
    });
    div.addEventListener('mousemove', (event) => {
        popup.classList.add('show');
        popup.style.left = event.pageX + 10 + 'px'; // Position the popup 10px to the right of the mouse
        popup.style.top = event.pageY + 10 + 'px'; // Position the popup 10px below the mouse
    });
    div.addEventListener('mouseleave', () => {
        popup.classList.remove('show');
    });
}
