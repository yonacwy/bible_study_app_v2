
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
    let json = await invoke('get_current_chapter_data', {});
    let chapter = JSON.parse(json);
    let html = '<ol>'

    for (let verse_index = 0; verse_index < chapter.verses.length; verse_index++)
    {
        let verse = chapter.verses[verse_index];
        let verse_text = '';
        for (let word_index = 0; word_index < verse.words.length; word_index++)
        {
            if (word_index != 0)
            {
                verse_text += ' '
            }

            let word = verse.words[word_index];
            verse_text += word.italicized ? `<i>${word.text}</i>` : word.text;
        }

        html += `<li>${verse_text}</li>`
    }

    html += '</ol>'

    return html;
}