import { invoke, debug_print, color_to_hex, inverse_color } from "./utils.js";
import { get_catagories, get_chapter_highlights } from "./highlights.js";

export async function load_view()
{
    let str = await invoke('get_bible_view', {});
    let view = JSON.parse(str);
    return view;
}

export async function get_chapter_view() 
{
    let str = await invoke('get_current_chapter_view', {});
    let view = JSON.parse(str);
    return view;
}

export async function get_chapter()
{
    let json = await invoke('get_current_chapter', {});
    let chapter = JSON.parse(json);
    return chapter;
}

export function create_books_selection()
{
    load_view().then(view => {
        let container = document.getElementById('books-dropdown');
        
        for (let i = 0; i < view.length; i++)
        {
            let book = view[i];
            
            let book_div = document.createElement('div');
            book_div.classList.add('dropdown-option');
            
            let span = document.createElement('span');
            span.innerHTML = book.name;
            book_div.appendChild(span);
            
            book_div.addEventListener('click', e => {
                set_book(i);
            });

            container.appendChild(book_div);
        }
    });
}

export async function create_chapter_selection() 
{
    let view = await load_view();
    let current = await get_chapter();
    
    let book = view[current.book];
    let container = document.getElementById('chapters-dropdown');
    for (let i = 0; i < book.chapterCount; i++)
    {       
        let chapter_div = document.createElement('div');
        chapter_div.classList.add('dropdown-option');
        
        let span = document.createElement('span');
        span.innerHTML = `${i + 1}`;
        chapter_div.appendChild(span);

        container.appendChild(chapter_div);

        chapter_div.addEventListener('click', e => {
            set_chapter(i);
        });

        container.appendChild(chapter_div);
    }
}

export async function create_highlight_selection(on_selected) 
{
    let highlight_data = await get_catagories();
    let container = document.getElementById('highlights-dropdown');

    let highlight_catagories = [];
    for(let id in highlight_data)
    {
        highlight_catagories.push(highlight_data[id]);
    }

    highlight_catagories = highlight_catagories.sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
    })

    for(let i = 0; i < highlight_catagories.length; i++)
    {
        let highlight = highlight_catagories[i];

        let highlight_div = document.createElement('div');
        highlight_div.classList.add('dropdown-option');
        
        let span = document.createElement('span');
        span.innerHTML = highlight.name;
        highlight_div.appendChild(span);

        let color_div = document.createElement('div');
        color_div.style.backgroundColor = color_to_hex(highlight.color);
        color_div.classList.add('color-square');
        highlight_div.appendChild(color_div);

        highlight_div.addEventListener('click', e => {
            let nodes = container.getElementsByClassName('dropdown-option');
            for (let i = 0; i < nodes.length; i++)
            {
                nodes[i].classList.remove('selected-option');
            }

            highlight_div.classList.add('selected-option');
            on_selected(highlight.id);
        });

        container.appendChild(highlight_div);
    }

    let none_div = document.createElement('div');
    none_div.classList.add('dropdown-option', 'selected-option');

    let span = document.createElement('span');
    span.innerHTML = 'None';
    none_div.appendChild(span);

    none_div.addEventListener('click', e => {
        let nodes = container.getElementsByClassName('dropdown-option');
        for (let i = 0; i < nodes.length; i++)
        {
            nodes[i].classList.remove('selected-option');
        }

        none_div.classList.add('selected-option');
        on_selected(null);
    });

    container.appendChild(none_div);
}

export async function set_book(book_index) 
{
    let chapter_src = JSON.stringify({book: book_index, number: 0});
    invoke('set_current_chapter', {chapter: chapter_src}).then((_) => {
        location.reload();
    });
}

export async function set_chapter(chapter) 
{
    let current = await get_chapter();
    let chapter_src = JSON.stringify({book: current.book, number: chapter});
    invoke('set_current_chapter', {chapter: chapter_src}).then((_) => {
        location.reload();
    });
}

export async function render_current_chapter()
{
    let text_json = await invoke('get_current_chapter_text', {});
    let chapter = JSON.parse(text_json);
    
    let catagories = await get_catagories();
    let chapter_highlights = await get_chapter_highlights();

    let html = '<ol>'

    let word_pos = 0;
    for (let verse_index = 0; verse_index < chapter.verses.length; verse_index++)
    {
        let verse = chapter.verses[verse_index];
        let verse_text = '';
        
        let last_word_highlights = null;
        for (let word_index = 0; word_index < verse.words.length; word_index++)
        {
            let word_color = null;
            let word_highlights = chapter_highlights[word_pos];
            let current_word_highlights = null;
            if(word_highlights !== undefined && word_highlights !== null)
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
            let word_text = bible_word(word.text);
            if (word.italicized)
            {
                word_text = italicize(word_text);
            }
                
            if(word_color !== null)
            {
                word_text = color(word_text, word_color);
            }

            if (word_index != 0)
            {
                let spacer = bible_space();

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
                verse_text += spacer
            }

            verse_text += word_text;
            word_pos++;
            last_word_highlights = current_word_highlights;
        }

        html += `<li>${verse_text}</li>`
    }

    html += '</ol>'

    return html;
}

function get_highest_priority_highlight(word_highlights, catagories)
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

function bible_space()
{
    return `<div class="bible-space">&nbsp;</div>`
}

function bible_word(t)
{
    return `<div class="bible-word">${t}</div>`
}

function italicize(t)
{
    return `<i>${t}</i>`;
}

function color(t, c)
{
    return `<span style=\"background-color:rgb(${c.r} ${c.g} ${c.b})\">${t}</span>`;
}