import { invoke, debug_print, color_to_hex, trim_string } from "./utils.js";
import { get_catagories, get_chapter_highlights, get_selected_highlight } from "./highlights.js";

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

export async function get_chapter_words() 
{
    let chapter_text = JSON.parse(await invoke('get_current_chapter_text', {}));

    let words = [];
    for(let v = 0; v < chapter_text.verses.length; v++)
    {
        let verse = chapter_text.verses[v];
        for(let w = 0; w < verse.words.length; w++)
        {
            let word = trim_string(verse.words[w].text);
            words.push(word);
        }
    }

    return words;
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
    let current_highlight_id = get_selected_highlight();

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
        if(highlight.id === current_highlight_id)
        {
            highlight_div.classList.add('selected-option');
        }
        
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
    none_div.classList.add('dropdown-option');
    if(current_highlight_id === null)
    {
        none_div.classList.add('selected-option');
    }

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

export async function set_book_and_chapter(book_index, chapter_index) 
{
    let chapter_json = JSON.stringify( {book: book_index, number: chapter_index });
    invoke('set_current_chapter', {chapter: chapter_json}).then(_ => {
        location.reload();
    })    
}