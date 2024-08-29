
const invoke = window.__TAURI__.invoke

function debug_print(msg)
{
    invoke('debug_print', {message: msg});
}

async function load_view()
{
    let str = await invoke('get_bible_view', {});
    let view = JSON.parse(str);
    return view;
}

async function get_chapter()
{
    let json = await invoke('get_current_chapter', {});
    let chapter = JSON.parse(json);
    return chapter;
}

function say_hello()
{
    debug_print("hello")
}

async function get_book_selection() 
{
    let view = await load_view();
    let html = "";
    for (let i = 0; i < view.length; i++)
    {
        let book = view[i];
        html += `<a href=\"javascript:set_book(${i})\">${book.name}</a>`;
    }

    return html;
}

async function get_chapter_selection() 
{
    let view = await load_view();
    let current = await get_chapter();

    
    let book = view[current.book];
    let html = "";
    for (let i = 0; i < book.chapterCount; i++)
    {
        html += `<a href=\"javascript:set_chapter(${i})\">${i + 1}</a>`;
    }    

    return html;
}

async function set_book(book_index) 
{
    let chapter_src = JSON.stringify({book: book_index, number: 0});
    invoke('set_current_chapter', {chapter: chapter_src}).then((_) => {
        location.reload();
    });
}

async function set_chapter(chapter) 
{
    let current = await get_chapter();
    let chapter_src = JSON.stringify({book: current.book, number: chapter});
    invoke('set_current_chapter', {chapter: chapter_src}).then((_) => {
        location.reload();
    });
}

async function render_current_chapter()
{
    let text_json = await invoke('get_current_chapter_text', {});
    let chapter = JSON.parse(text_json);

    let notes_json = await invoke('get_current_chapter_notes', {});
    let notes = notes_json === null ? null : JSON.parse(notes_json);

    let html = '<ol>'

    for (let verse_index = 0; verse_index < chapter.verses.length; verse_index++)
    {
        let verse = chapter.verses[verse_index];
        let verse_text = '';
        
        let last_note_index = -1;
        for (let word_index = 0; word_index < verse.words.length; word_index++)
        {   
            let word = verse.words[word_index];
            let word_text = word.text;
            if (word.italicized)
            {
                word_text = italicize(word_text);
            }

            let current_note_index = -1;
                
            if (notes != null)
            {
                let note_index = -1;
                for (let i = 0; i < notes.length; i++)
                {
                    let note = notes[i];
                    let start = note.start;
                    let end = note.end;

                    if (verse_index < start.verse || verse_index > end.verse) { continue; }
                    if (verse_index == start.verse && word_index < start.word) { continue; }
                    if (verse_index == end.verse && word_index > end.word) { continue; }

                    word_text = color(word_text, note.color);
                    note_index = i;
                }
                current_note_index = note_index;
            }

            if (word_index != 0)
            {
                let spacer = bible_space();
                if (current_note_index != -1 && current_note_index == last_note_index)
                {
                    // should only be called if there is a note, so no need for null checking
                    spacer = color(spacer, notes[current_note_index].color);
                }

                verse_text += spacer
            }

            verse_text += bible_word(word_text);
            last_note_index = current_note_index;
        }

        html += `<li>${verse_text}</li>`
    }

    html += '</ol>'

    return html;
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