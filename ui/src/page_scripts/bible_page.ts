import * as utils from "../utils/index.js";
import * as bible from "../bible.js";
import * as bible_renderer from "../rendering/bible_render.js";
import { BibleSection, ChapterIndex, VerseRange } from "../bindings.js";
import * as pages from "./pages.js";
import * as view_states from "../view_states.js";
import * as side_popup from "../popups/side_popup.js";
import * as word_select from "../word_select.js";
import { range_inclusive } from "../utils/ranges.js";
import * as audio_player from "../popups/audio_player.js";

const CONTENT_ID: string = "chapter-text-content";
const CHAPTER_NAME_ID: string = "chapter-name"

const NEXT_CHAPTER_BUTTON_ID: string = "next-chapter-btn";
const PREVIOUS_CHAPTER_BUTTON_ID: string = "previous-chapter-btn";

export async function run()
{
    let data = utils.decode_from_url(window.location.href) as BibleSection;
    utils.init_format_copy_event_listener();

    bible.add_version_changed_listener(_ => {
        utils.scrolling.save_scroll(null);
    });

    audio_player.init_player();

    Promise.all([
        pages.init_header(e => {
            let last = e.children[e.children.length - 1];
            let button = spawn_audio_player_button();
            e.insertBefore(button, last);
        }),
        pages.init_context_menu('chapter-content'),
        init_chapter_buttons(),
        display_chapter({book: data.book, number: data.chapter}, data.verse_range),
    ]).then(_ => {
        document.body.style.visibility = 'visible';
        utils.scrolling.load_scroll();
    });
}

export async function display_chapter(chapter: ChapterIndex, verse_range: VerseRange | null)
{
    const content = document.getElementById(CONTENT_ID);
    const word_popup = document.getElementById(pages.WORD_POPUP_ID);
    const popup_panel = document.getElementById(pages.POPUP_PANEL_ID);
    const popup_panel_content = document.getElementById(pages.POPUP_PANEL_CONTENT_ID);

    if(content === null || word_popup === null) { return; }
    content.replaceChildren();

    let panel_data: side_popup.PanelData | null = null;
    if(popup_panel && popup_panel_content)
    {
        panel_data = {
            popup_panel: popup_panel,
            popup_panel_content: popup_panel_content
        };
    }

    let chapter_view = await bible.load_view();
    
    let name = chapter_view[chapter.book].name;
    let number = chapter.number + 1;
    
    let input_value = `${name} ${number}`;
    if (verse_range !== null)
    {
        if (verse_range.start === verse_range.end)
        {
            input_value += `:${verse_range.start + 1}`; // need to do index conversion
        }
        else 
        {
            input_value += `:${verse_range.start + 1}-${verse_range.end + 1}`; // need to do index conversion
        }
    }

    utils.set_value(pages.SEARCH_INPUT_ID, input_value);
    utils.set_html(CHAPTER_NAME_ID, `${name} ${number}`);

    let on_search = (msg: string): void => {
        utils.set_value('search-input', msg);
        document.getElementById('search-btn')?.click();
    }

    let on_render = (): void => {
        word_select.update_words_for_selection();
        audio_player.on_passage_render();
    }

    return await bible_renderer.render_chapter(chapter, content, word_popup, panel_data, on_render, on_search).then(() => {
        if(verse_range !== null)
        {
            let start = verse_range.start;
            let content = document.getElementById(CONTENT_ID);
            if (content) 
            {
                let elements = range_inclusive(verse_range.start, verse_range.end)
                    .map(i => content.getElementsByClassName(`verse-index-${i}`)[0])
                    .filter(v => v != null)
                    .toArray();

                function on_element_clicked()
                {
                    elements.forEach(e => {
                        e.removeEventListener('click', on_element_clicked);
                        e.classList.remove('searched');
                    });
                }

                elements.forEach(e => {
                    e.addEventListener('click', on_element_clicked);
                    e.classList.add('searched');
                })

                let element = content.getElementsByClassName(`verse-index-${start}`)[0];
                if (element !== undefined)
                {
                    element.scrollIntoView();
                    window.scrollBy(0, -40);
                }
            }
        }

        word_select.update_words_for_selection();
    });
}

export async function init_chapter_buttons()
{
    utils.on_click(PREVIOUS_CHAPTER_BUTTON_ID, e => {
        bible.to_previous_chapter().then(() => {
            utils.play_audio(utils.AudioClip.Flip);
            utils.reset_scroll();
            view_states.goto_current_view_state();
        })
    });

    utils.on_click(NEXT_CHAPTER_BUTTON_ID, e => {
        bible.to_next_chapter().then(() => {
            utils.play_audio(utils.AudioClip.Flip);
            utils.reset_scroll();
            view_states.goto_current_view_state();
        })
    })
}

export function spawn_audio_player_button(): HTMLElement
{
    let button = utils.spawn_image_button(utils.images.VOLUME_MID, _ => {
        if(audio_player.is_player_hidden())
        {
            audio_player.show_player();
        }
        else 
        {
            audio_player.hide_player();
        }
    }).button;

    audio_player.ON_PLAYER_VISIBILITY_CHANGED.add_listener(visible => {
        if(visible)
        {
            button.classList.add('active');
        }
        else 
        {
            button.classList.remove('active');
        }
    });

    return button;
}
