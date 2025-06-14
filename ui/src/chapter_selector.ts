import { get_bible_view } from "./bible.js";
import { ChapterIndex } from "./bindings.js";
import * as utils from "./utils/index.js";

function spawn_normal_option(name: string): HTMLElement
{
    let option_div = document.createElement('div');
    option_div.classList.add('dropdown-option');
    option_div.innerHTML = name;
    return option_div;
}

function spawn_expanded_option(book_index: number, name: string, count: number, on_selected: (chapter: ChapterIndex) => void): HTMLElement
{
    let option_div = document.createElement('div');
    option_div.classList.add('dropdown-option');
    option_div.classList.add('expanded-option');

    let title_div = document.createElement('div');
    title_div.classList.add('expanded-option-title');
    title_div.innerHTML = name;
    option_div.appendChild(title_div);

    option_div.appendChild(document.createElement('hr'));

    let grid_div = document.createElement('div');
    grid_div.classList.add("grid-container");

    for(let i = 0; i < count; i++)
    {
        let number = i + 1;   
        let grid_item_div = document.createElement('div');
        grid_item_div.classList.add('grid-item');
        grid_item_div.innerHTML = `${number}`;

        grid_item_div.addEventListener('click', e => {
            on_selected({
                book: book_index,
                number: i,
            });
        })

        grid_div.appendChild(grid_item_div);
    }

    option_div.appendChild(grid_div);
    return option_div;
}

export async function spawn_chapter_selection_dropdown(on_selected: (chapter: ChapterIndex) => void): Promise<HTMLElement>
{
    let books = await get_bible_view();
    let expanded_options: HTMLElement[] = [];
    let normal_options: HTMLElement[] = [];

    return utils.spawn_element('div', ['dropdown'], dropdown => {
        utils.spawn_image_button_args({
            image: utils.images.BOOKS,
            on_click: (_, btn) => {
                btn.button.classList.toggle('active');
                dropdown.classList.toggle('active');
            },
            title: 'Bible chapter selection',
            parent: dropdown,
        })
        dropdown.append_element('div', ['dropdown-content'], content => {
            for (let i = 0; i < books.length; i++)
            {
                let name = books[i].name;
                let chapter_count = books[i].chapter_count;

                let normal = spawn_normal_option(name);
                content.appendChild(normal);
                normal_options.push(normal);

                let expanded = spawn_expanded_option(i, name, chapter_count, on_selected);
                expanded.hide(true);
                content.appendChild(expanded);
                expanded_options.push(expanded);

                normal.addEventListener('click', _ => {
                    normal_options.forEach(n => n.hide(false));
                    expanded_options.forEach(n => n.hide(true));

                    normal.hide(true);
                    expanded.hide(false);
                });

                (expanded.querySelector('.expanded-option-title') as HTMLElement).addEventListener('click', _ => {
                    normal_options.forEach(n => n.hide(false));
                    expanded_options.forEach(n => n.hide(true));
                });
            }
        })
    })
}