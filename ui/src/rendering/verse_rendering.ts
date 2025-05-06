import { ChapterIndex, Color, Word, WordAnnotations } from "../bindings.js";
import * as utils from "../utils/index.js"
import * as rendering from "./bible_rendering.js";
import * as bible from "../bible.js";
import * as highlighting from "../highlights.js"
import * as wp from "../popups/word_popup.js";
import * as sp from "../popups/side_popup.js";

const HIGHLIGHT_CATEGORIES = await highlighting.get_categories();

export type VerseRenderArgs = {
    chapter: ChapterIndex,
    verse: number,
    word_popup: HTMLElement,
    side_popup_data: sp.PanelData | null,
    bolded: string[] | null,
    on_search: (msg: string) => void
}

export async function render_verse(args: VerseRenderArgs): Promise<HTMLElement[]>
{
    let elements = [];

    let verse_data = await utils.invoke('get_verse', { book: args.chapter.book, chapter: args.chapter.number, verse: args.verse });
    let words: Word[] = verse_data.words;
    let offset = await bible.get_verse_word_offset(args.chapter.book, args.chapter.number, args.verse);
    let chapter_annotations = JSON.parse(await utils.invoke('get_chapter_annotations', { chapter: args.chapter}));

    if (words.all(w => w.text.trim() == ''))
    {
        let e = document.createElement('div');
        e.innerHTML = '[Verse omitted]';
        e.style.fontStyle = 'italic';
        elements.push(e);
        return elements;
    }

    let last_word_annotations: WordAnnotations | null = null;
    for(let i = 0; i < words.length; i++)
    {
        let word_annotations: WordAnnotations | null | undefined = chapter_annotations[offset + i];

        if(i != 0)
        {
            let space: HTMLElement = rendering.create_bible_space();

            if(word_annotations !== undefined && word_annotations !== null && last_word_annotations !== null)
            {
                if(word_annotations.highlights.length !== 0 && last_word_annotations.highlights.length !== null)
                {
                    let overlap: any[] = utils.overlap(word_annotations.highlights, last_word_annotations.highlights);
                    if(overlap.length !== 0)
                    {
                        let space_highlight = rendering.get_highest_priority_highlight(overlap, HIGHLIGHT_CATEGORIES);
                        let space_color = HIGHLIGHT_CATEGORIES[space_highlight].color;
                        space = rendering.color(space, space_color);
                    }
                }
                if(word_annotations.notes.length !== null && last_word_annotations.notes.length !== 0)
                {
                    space.style.textDecoration = 'underline';
                }
            }
            
            elements.push(space);
        }

        let color: Color | null = null;
        if(word_annotations !== null && word_annotations !== undefined)
        {
            if(word_annotations.highlights.length !== 0)
            {
                let id = rendering.get_highest_priority_highlight(word_annotations.highlights, HIGHLIGHT_CATEGORIES);
                color = HIGHLIGHT_CATEGORIES[id].color;
            }

            last_word_annotations = word_annotations;
        }
        else 
        {
            last_word_annotations = null;
        }

        let has_notes = false;
        if(word_annotations !== null && word_annotations !== undefined && word_annotations.notes.length !== 0)
        {
            has_notes = true;
        }

        let word_node = rendering.render_word({
            word: words[i], 
            searched: args.bolded, 
            has_note: has_notes,
            color: color,
        });

        if(word_annotations !== null && word_annotations !== undefined && (word_annotations.highlights.length !== 0 || word_annotations.notes.length !== 0))
        {
            wp.display_on_div(word_node, word_annotations.highlights, has_notes, args.word_popup);

            if(args.side_popup_data !== null)
            {
                let word = utils.trim_string(words[i].text);
                sp.display_on_div(word_node, word, word_annotations, args.side_popup_data, args.on_search);    
            }
        }

        elements.push(word_node);
    }

    return elements;
}