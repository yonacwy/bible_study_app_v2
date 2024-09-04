import { invoke, debug_print, color_to_hex, inverse_color } from "./utils.js";
import { get_catagories } from "./highlights.js";

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
    for(let id in highlight_data)
    {
        let highlight = highlight_data[id];

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

    // let notes_json = await invoke('get_current_chapter_notes', {});
    // let notes = notes_json === null ? null : JSON.parse(notes_json);

    let html = '<ol>'

    for (let verse_index = 0; verse_index < chapter.verses.length; verse_index++)
    {
        let verse = chapter.verses[verse_index];
        let verse_text = '';
        
        // let last_note_index = -1;
        for (let word_index = 0; word_index < verse.words.length; word_index++)
        {   
            let word = verse.words[word_index];
            let word_text = bible_word(word.text);
            if (word.italicized)
            {
                word_text = italicize(word_text);
            }

            // let current_note_index = -1;
                
            // if (notes != null)
            // {
            //     let note_index = -1;
            //     for (let i = 0; i < notes.length; i++)
            //     {
            //         let note = notes[i];
            //         let start = note.start;
            //         let end = note.end;

            //         if (verse_index < start.verse || verse_index > end.verse) { continue; }
            //         if (verse_index == start.verse && word_index < start.word) { continue; }
            //         if (verse_index == end.verse && word_index > end.word) { continue; }

            //         word_text = color(word_text, note.color);
            //         note_index = i;
            //     }
            //     current_note_index = note_index;
            // }

            if (word_index != 0)
            {
                let spacer = bible_space();
                // if (current_note_index != -1 && current_note_index == last_note_index)
                // {
                //     spacer = color(spacer, notes[current_note_index].color);
                // }

                verse_text += spacer
            }

            verse_text += word_text;
            // last_note_index = current_note_index;
        }

        html += `<li>${verse_text}</li>`
    }

    html += '</ol>'

    return html;
}

export function get_word_index(word_number, view)
{
    for (let i = 0; i < view.verses.length; i++)
    {
        let verse = view.verses[i];
        if (verse <= word_number)
        {
            word_number -= verse;
        }
        else 
        {
            return {
                verse: i,
                word: word_number
            };
        }
    }
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