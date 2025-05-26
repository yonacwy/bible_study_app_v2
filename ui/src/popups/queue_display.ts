import * as utils from "../utils/index.js";
import * as reader from "../bible_reader.js";
import * as bible from "../bible.js";

export async function show_queue_display(state: reader.PlayerBehaviorState, on_close: () => void)
{
    let queue = await state.get_queue(5);

    let display = utils.spawn_element('div', ['queue-display'], display => {
        display.append_element_ex('div', ['popup-content'], content => {
            
            content.append_element_ex('div', ['popup-header'], title => {
                title.append_element('span', t => t.innerHTML = 'Reading Queue');
                
                // close button
                let button = utils.spawn_image_button(utils.images.X_MARK, e => {
                    display.remove();
                    on_close();
                });

                title.appendChild(button.button);
            });

            content.append_element_ex('div', ['reading-list'], async list => {
                for(let i = 0; i < queue.sections.length; i++)
                {
                    list.appendChild(await spawn_reading(queue.sections[i], i === queue.current, () => {
                        let index = i + queue.offset;
                        state.reading_index = index;
                        display.remove();
                        show_queue_display(state, on_close);
                    }));
                }
            });
        });
    });

    document.body.appendChild(display);
}

async function spawn_reading(reading: reader.BibleReaderSection, is_current: boolean, on_click: () => void): Promise<HTMLElement>
{
    let book_name = await bible.get_book_name(reading.chapter.book);
    let chapter_name = (reading.chapter.number + 1).toString();

    let verse_range = '';
    if (reading.verses !== null)
    {
        verse_range = `:${reading.verses.start + 1}-${reading.verses.end + 1}`;
    }

    let text = `${book_name} ${chapter_name}${verse_range}`;

    return utils.spawn_element('div', ['reading'], node => {
        node.append_element('span', s => s.innerHTML = text);
        if (is_current)
        {
            node.classList.add('current');
            node.append_element_ex('span', ['now-playing'], np => np.innerHTML = 'Now Playing');
        }
        node.addEventListener('click', e => {
            on_click();
        })
    })
}