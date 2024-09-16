import * as utils from "./utils.js";
import * as render from "./bible_render.js"

export async function render_search_result(result, results_id, on_search) 
{
    utils.debug_print(JSON.stringify(result));
    const results_node = document.getElementById(results_id);
    results_node.replaceChildren();
    
    for(let i = 0; i < result.result.length; i++)
    {
        let result_data = result.result[i];
        let verse = await utils.invoke('get_verse', { book: result_data.book, chapter: result_data.chapter, verse: result_data.verse });
        
        let verse_node = spawn_verse(verse.words);
        let reference_node = await spawn_reference(result_data.book, result_data.chapter, result_data.verse, on_search);
        

        let result_node = document.createElement('div');
        result_node.classList.add('verse');
        result_node.appendChild(verse_node);
        result_node.appendChild(reference_node);
        results_node.appendChild(result_node);
    }
}

function spawn_verse(words)
{
    let verse_node = document.createElement('p');
    
    for(let i = 0; i < words.length; i++)
    {
        if(i != 0)
        {
            verse_node.appendChild(render.create_bible_space());
        }

        verse_node.appendChild(render_word(words[i]));
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

function render_word(word)
{
    let word_node = render.create_bible_word(word.text);
    if (word.italicized)
    {
        word_node = render.italicize(word_node);
    }

    return word_node
}