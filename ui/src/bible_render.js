import { get_selected_highlight, highlight_word, get_catagories, get_chapter_highlights, erase_highlight } from "./highlights.js";
import { debug_print, get_toggle_value, invoke, color_to_hex } from "./utils.js";
import { init_word_popup_for_chapter } from "./word_popup.js";
import { init_popup_panel } from "./side_popup.js"
import { ERASER_STATE_NAME } from "./save_states.js";

const HIGHLIGHT_SELECTED_WORD_COLOR = 'blueviolet';

export async function render_current_chapter(content_id, word_popup_id, popup_panel_id) 
{
    document.getElementById(content_id).replaceChildren();

    return render_chapter_text().then((content) => {
        document.getElementById(content_id).appendChild(content);
    }).then(() => {
        init_word_popup_for_chapter(word_popup_id, content_id);
        init_popup_panel(popup_panel_id, content_id);

        let word_divs = document.getElementsByClassName('bible-word');
        let is_dragging = false;

        document.addEventListener('mouseup', e => {
            if(is_dragging && get_selected_highlight() !== null)
            {
                is_dragging = false;
                render_current_chapter(content_id, word_popup_id, popup_panel_id); 
            }
        });

        for(let i = 0; i < word_divs.length; i++)
        {
            let word_div = word_divs[i];
            word_div.addEventListener('mousedown', e => {
                if(get_selected_highlight() !== null)
                {
                    is_dragging = true;
                    update_word(i, word_div);
                }
            });

            word_div.addEventListener('mouseover', e => {
                if(is_dragging && get_selected_highlight() !== null)
                {
                    update_word(i, word_div);
                }
                
            });
        }
    });    
}

function update_word(i, div)
{
    div.style.color = HIGHLIGHT_SELECTED_WORD_COLOR;
    if(get_toggle_value(ERASER_STATE_NAME) !== true)
    {
        highlight_word(i, get_selected_highlight()); // if the eraser is false, we highlight
    }
    else 
    {
        erase_highlight(i, get_selected_highlight()); // if eraser is true, we erase
    }
}

async function render_chapter_text()
{
    let text_json = await invoke('get_current_chapter_text', {});
    let chapter = JSON.parse(text_json);
    
    let catagories = await get_catagories();
    let chapter_highlights = await get_chapter_highlights();
    
    let chapter_ordered_list = document.createElement('ol');

    let word_pos = 0;
    for (let verse_index = 0; verse_index < chapter.verses.length; verse_index++)
    {
        let verse = chapter.verses[verse_index];
        
        let last_word_highlights = null;

        let verse_list_item = document.createElement('li');
        verse_list_item.id = `verse-index-${verse_index}`;

        for (let word_index = 0; word_index < verse.words.length; word_index++)
        {
            let word_color = null;
            let word_highlights = chapter_highlights[word_pos];
            let current_word_highlights = null;
            if(word_highlights !== undefined && word_highlights !== null && word_highlights.length > 0)
            {
                current_word_highlights = word_highlights;
                let id = get_highest_priority_highlight(word_highlights, catagories);
                word_color = catagories[id].color;
            }
            else 
            {
                last_word_highlights = null;
            }

            
            let word = verse.words[word_index];
            let word_node = create_bible_word(word.text);
            if (word.italicized)
            {
                word_node = italicize(word_node);
            }
                
            if(word_color !== null)
            {
                word_node = color(word_node, word_color);
            }

            if (word_index != 0)
            {
                let spacer = create_bible_space();

                if(current_word_highlights != null && last_word_highlights != null)
                {
                    let overlap = current_word_highlights.filter(h => last_word_highlights.includes(h));

                    if(overlap.length > 0)
                    {
                        let id = get_highest_priority_highlight(overlap, catagories);
                        let space_color = catagories[id].color;
                        spacer = color(spacer, space_color);
                    }
                }
                verse_list_item.appendChild(spacer);
            }

            verse_list_item.appendChild(word_node);
            word_pos++;
            last_word_highlights = current_word_highlights;
        }
        
        chapter_ordered_list.appendChild(verse_list_item);
    }

    return chapter_ordered_list
}

export function get_highest_priority_highlight(word_highlights, catagories)
{
    let max_highlight = word_highlights[0];
    for(let i = 1; i < word_highlights.length; i++)
    {
        let priority = catagories[word_highlights[i]].priority;
        let max_priority = catagories[max_highlight].priority

        if(priority > max_priority)
        {
            max_highlight = word_highlights[i];
        } 
    }

    if(max_highlight === null) { debug_print('this is a problem'); return null; }
    return max_highlight;
}

export function create_bible_space()
{
    let space = document.createElement('div');
    space.innerHTML = "&nbsp;"
    space.classList.add('bible-space');
    return space;
}

export function create_bible_word(t)
{
    let word = document.createElement('div');
    word.innerHTML = t;
    word.classList.add('bible-word');
    return word;
}

export function italicize(t)
{
    let i = document.createElement('i');
    i.appendChild(t);
    return i;
}

export function bold(t)
{
    let b = document.createElement('strong');
    b.appendChild(t);
    return b;
}

export function color(t, c)
{
    let span = document.createElement('span');
    span.appendChild(t);
    span.style.backgroundColor = color_to_hex(c);
    return span;
}