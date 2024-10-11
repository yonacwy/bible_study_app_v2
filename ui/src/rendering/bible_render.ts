import * as highlighting from "../highlights.js";
import * as utils from "../utils.js";
import { ERASER_STATE_NAME } from "../save_states.js";
import * as bible from "../bible.js";
import { ChapterIndex, Color } from "../bindings.js";
import * as verse_renderer from "./verse_rendering.js";

export const HIGHLIGHT_SELECTED_WORD_COLOR = 'blueviolet';

export async function render_chapter(chapter: ChapterIndex, content_id: string, word_popup_id: string, popup_panel_id: string, on_render: (() => void) | null)
{
    document.getElementById(content_id)?.replaceChildren();
    let chapter_ol = document.createElement('ol');
    let view = await bible.

    for (let verse_index = 0; verse_index < chapter.verses.length; verse_index++)
    {

        let verse_list_item = document.createElement('li');
        verse_list_item.classList.add(`verse-index-${verse_index}`);
        
        chapter_ol.appendChild(verse_list_item);
    }
    
    return chapter_ol;
}

export async function render_current_chapter(content_id: string, word_popup_id: string, popup_panel_id: string, on_render: (() => void) | null): Promise<void>
{
    let chapter = await bible.get_chapter() as ChapterIndex;
    return await render_chapter(chapter, content_id, word_popup_id, popup_panel_id, on_render);
}
async function render_chapter_text(chapter_index: ChapterIndex): Promise<HTMLOListElement>
{
    let text_json = await utils.invoke('get_chapter_text', { chapter: chapter_index });
    let chapter = JSON.parse(text_json);
    
    let catagories = await highlighting.get_catagories();
    let chapter_annotations = await highlighting.get_chapter_annotations(chapter_index);
    
    let chapter_ordered_list = document.createElement('ol');

    let word_pos = 0;
    for (let verse_index = 0; verse_index < chapter.verses.length; verse_index++)
    {
        let verse = chapter.verses[verse_index];
        
        let last_word_highlights: string[] | null = null;

        let verse_list_item = document.createElement('li');
        verse_list_item.classList.add(`verse-index-${verse_index}`);

        for (let word_index = 0; word_index < verse.words.length; word_index++)
        {
            let word_color = null;
            let word_annotations = chapter_annotations[word_pos];
            let current_word_highlights: string[] | null = null;
            if(word_annotations !== undefined && word_annotations !== null && word_annotations.highlights.length > 0)
            {
                current_word_highlights = word_annotations.highlights;
                let id: string = get_highest_priority_highlight(word_annotations.highlights, catagories);
                word_color = catagories[id].color;
            }
            else 
            {
                last_word_highlights = null;
            }

            
            let word = verse.words[word_index];
            let word_node = create_bible_word(word.text) as HTMLElement;
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
                let spacer: HTMLElement = create_bible_space();

                if(current_word_highlights !== null && last_word_highlights !== null)
                {
                    let overlap = current_word_highlights.filter(h => last_word_highlights?.includes(h));

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