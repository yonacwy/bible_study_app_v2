import * as utils from "./utils.js";
import * as bible from "./bible.js";
export async function get_note(id) {
    return JSON.parse(await utils.invoke('get_note', { id: id }));
}
export async function get_note_references(note_data) {
    let references = [];
    let bible_view = await bible.load_view();
    for (let i = 0; i < note_data.locations.length; i++) {
        let location = note_data.locations[i];
        let view = await bible.get_chapter_view(location.chapter);
        let start = bible.flatten_verse_index(view, location.range.verse_start, location.range.word_start);
        let end = bible.flatten_verse_index(view, location.range.verse_end, location.range.word_end);
        let words = await bible.get_chapter_words(location.chapter);
        let text = words.slice(start, end + 1).join(' ');
        let name = bible.shorten_book_name(bible_view[location.chapter.book].name);
        let title = `${name} ${location.chapter.number + 1}:${location.range.verse_start + 1}`;
        if (location.range.verse_start !== location.range.verse_end) {
            title += `-${location.range.verse_end}`;
        }
        references.push(`${title} > "${text}"`);
    }
    return references;
}
