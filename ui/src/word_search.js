import * as utils from "./utils.js";
import * as render from "./bible_render.js"
import * as bible from "./bible.js";
import { get_catagories } from "./highlights.js";

export async function render_search_result(result, results_id, on_search, searched) 
{
    const catagories = await get_catagories();
    const results_node = document.getElementById(results_id);
    results_node.replaceChildren();
    
    for(let i = 0; i < result.result.length; i++)
    {
        let result_data = result.result[i];
        let verse_data = await utils.invoke('get_verse', { book: result_data.book, chapter: result_data.chapter, verse: result_data.verse });
        
        let verse_node = await spawn_verse(verse_data.words, searched, result_data, catagories);
        let reference_node = await spawn_reference(result_data.book, result_data.chapter, result_data.verse, on_search);

        let result_node = document.createElement('div');
        result_node.classList.add('verse');
        result_node.appendChild(verse_node);
        result_node.appendChild(reference_node);
        results_node.appendChild(result_node);
    }
}

async function spawn_verse(words, searched, position, catagories)
{
    let verse_node = document.createElement('p');
    let offset = await bible.get_verse_word_offset(position.book, position.chapter, position.verse);
    let highlights = JSON.parse(await utils.invoke('get_chapter_highlights', { chapter: {
        book: position.book,
        number: position.chapter,
    }}));
    
    for(let i = 0; i < words.length; i++)
    {
        if(i != 0)
        {
            verse_node.appendChild(render.create_bible_space());
        }

        let word_highlights = highlights[offset + i];

        let color = null;
        if(word_highlights !== null && word_highlights !== undefined && word_highlights.length !== 0)
        {
            utils.debug_print('got here');
            let id = render.get_highest_priority_highlight(word_highlights, catagories);
            color = catagories[id].color;
        }

        verse_node.appendChild(render_word(words[i], searched, color));
    }
    
    return verse_node;
}

async function spawn_reference(book, chapter, verse, on_search)
{
    let book_title = await utils.invoke('get_book_name', { book: book });
    let verse_reference_text = `${book_title} ${chapter + 1}:${verse + 1}`;

    let reference = document.createElement('div');
    reference.classList.add('reference');
    reference.innerHTML = verse_reference_text;
    reference.addEventListener('click', e => {
        on_search(verse_reference_text);
    });

    return reference;
}

function render_word(word, searched, color)
{
    let word_node = render.create_bible_word(word.text);
    if (word.italicized)
    {
        word_node = render.italicize(word_node);
    }
    
    if (searched.includes(utils.trim_string(word.text)))
    {
        word_node = render.bold(word_node);
    }

    if(color !== null)
    {
        word_node = render.color(word_node, color);
    }

    return word_node
}