import * as utils from "../utils/index.js";
import * as bible from "../bible.js";
import { spawn_chapter_selection_dropdown } from "../chapter_selector.js";
import * as view_states from "../view_states.js";
import { show_error_popup } from "../popups/error_popup.js";
import { ChapterIndex } from "../bindings.js";

export function get_header(): HTMLElement
{
    return document.getElementsByTagName('header')[0];
}

export type MainPageHeaderData = {
    update_nav_active: () => Promise<void>,
    on_search: (msg: string) => void,
}

export async function init_main_page_header(args: {
    extra?: (e: HTMLElement) => void,
    old_path: string,
}): Promise<MainPageHeaderData>
{
    let header = get_header();
    header.appendChild(await spawn_version_dropdown());

    let on_chapter_select = (chapter: ChapterIndex): void => {
        view_states.push_section({
            book: chapter.book,
            chapter: chapter.number,
            verse_range: null,
        }).then(_ => {
            view_states.goto_current_view_state();
        })
    }

    header.appendChild(await spawn_chapter_selection_dropdown(on_chapter_select));

    let searchbar = spawn_searchbar();
    header.appendChild(searchbar.root);

    let nav = await spawn_nav_buttons();
    header.appendChild(nav.back);
    header.appendChild(nav.forward);

    if (args.extra)
    {
        args.extra(header);
    }

    header.appendChild(spawn_settings_dropdown(args.old_path));

    return {
        on_search: searchbar.on_search,
        update_nav_active: nav.update_active,
    }
}

export function init_settings_page_header(args: {
    middle: HTMLElement[], 
    on_back_clicked: () => void, 
    old_path: string
})
{
    let header = get_header();
    utils.create_image_button(header, utils.images.BACKWARD, args.on_back_clicked);
    header.append(...args.middle);
    header.appendChild(spawn_settings_dropdown(args.old_path))
}

export type SearchBarData = {
    root: HTMLElement,
    on_search: (msg: string) => void,
}

function spawn_searchbar(): SearchBarData
{
    const SEARCH_ERROR_ID = 'search-error-id';

    // FIXME-LATER: might want to move setting the input value to the individual pages as opposed to all in this file, 
    // but this is fine for now
    let input = utils.spawn_element('input', [], async i => {
        i.type = 'text';

        let view_state = await view_states.get_current_view_state();
        if (view_state.type === 'chapter')
        {
            let book_name = await bible.get_book_name(view_state.chapter.book);
            let chapter = view_state.chapter.number + 1;
            i.value = `${book_name} ${chapter}`;
            if (view_state.verse_range !== null)
            {
                if (view_state.verse_range.start === view_state.verse_range.end)
                {
                    i.value += `:${view_state.verse_range.start + 1}`;
                }
                else 
                {
                    i.value += `:${view_state.verse_range.start + 1}-${view_state.verse_range.end + 1}`;
                }
            }
        }
        else 
        {
            i.value = view_state.words.join(' ');
        }
    });
        
    let button = utils.spawn_image_button_args({
        image: utils.images.MAGNIFYING_GLASS,
        title: 'Search the Bible',
    });

    let on_search = (msg: string): void => {
        input.value = msg;
        button.button.click();
    }

    let root = utils.spawn_element('div', ['searchbar'], searchbar => {
        searchbar.style.position = 'relative';
        searchbar.appendChild(input);
        searchbar.appendChild(button.button);

        searchbar.append_element('div', ['error-popup'], err => {
            err.id = SEARCH_ERROR_ID;
        });

        button.button.addEventListener('click', e => {
            let value = input.value;
            utils.invoke('parse_bible_search', { text: value }).then(result => {
                if(result.type !== 'error') { utils.reset_scroll() }
    
                if(result.type === 'error')
                {
                    show_error_popup(SEARCH_ERROR_ID, true, result.error);
                }
                else if(result.type === 'word')
                {
                    view_states.push_word_search(result.words, 0).then(() => {
                        view_states.goto_current_view_state();
                    });
                }
                else if (result.type === 'section')
                {
                    view_states.push_section(result.section).then(() => {
                        view_states.goto_current_view_state();
                    });
                }
                else 
                {
                    show_error_popup(SEARCH_ERROR_ID, true, `Search type ${result.type} unsupported on the front end`);
                }
            })
        });

        input.addEventListener('keydown', e => {
            if(e.key === 'Enter')
            {
                button.button.click();
            }
        });
    });

    return {
        root,
        on_search,
    }
}

export type NavButtons = {
    back: HTMLElement,
    forward: HTMLElement,
    update_active: () => Promise<void>,
}

async function spawn_nav_buttons(): Promise<NavButtons>
{
    let back_btn = utils.spawn_image_button_args({
        image: utils.images.ARROW_TURN_LEFT,
        title: 'Go back',
        on_click: _ => {
            view_states.previous_view_state().then(_ => {
                view_states.goto_current_view_state();
            });
        }
    });

    let forward_btn = utils.spawn_image_button_args({
        image: utils.images.ARROW_TURN_RIGHT,
        title: 'Go forward',
        on_click: _ => {
            view_states.next_view_state().then(_ => {
                view_states.goto_current_view_state();
            });
        }
    });

    let update_active = async (): Promise<void> => {
        if (await view_states.is_first_view_state())
        {
            back_btn.button.classList.add('inactive');
        }

        if (await view_states.is_last_view_state())
        {
            forward_btn.button.classList.add('inactive');
        }
    }

    await update_active();

    return {
        back: back_btn.button,
        forward: forward_btn.button,
        update_active,
    }
}

export async function spawn_version_dropdown(): Promise<HTMLElement>
{
    let versions = await bible.get_bible_versions().then(vs => vs.sort());

    let current = await bible.get_current_bible_version();
    let current_index = versions.indexOf(current);
    let options = versions.map(v => {
        return {
            text: v,
            tooltip: `Select ${v}`,
            value: v,
        } as utils.TextDropdownOption<string>
    })

    let dropdown = utils.spawn_toggle_text_dropdown<string>({
        title_text: null,
        tooltip: 'Select Bible version',
        default_index: current_index,
        options,
    });

    dropdown.on_change.add_listener(v => {
        bible.set_bible_version(v.value);
    });

    return dropdown.root;
}

type SettingsDropdownType = 'settings' | 'readings' | 'help' | 'highlights';
function spawn_settings_dropdown(old_path: string): HTMLElement
{
    function goto_option_page(path: string)
    {
        window.location.href = utils.encode_to_url(path, { old_path });
    }

    let dropdown = utils.spawn_image_dropdown<SettingsDropdownType>({
        title_image: utils.images.UNORDERED_LIST,
        tooltip: 'Options',
        options: [
            {
                image: utils.images.PAINTBRUSH_PENCIL,
                tooltip: 'Highlight Options',
                value: 'highlights',
            },
            {
                image: utils.images.GEAR_COMPLEX,
                tooltip: 'Settings',
                value: 'settings',
            },
            {
                image: utils.images.CALENDER,
                tooltip: 'Daily Readings',
                value: 'readings',
            },
            {
                image: utils.images.INFO,
                tooltip: 'Help',
                value: 'help',
            }
        ],
        parent: null,
        id: null,
        is_small: false,
        is_content_small: true,
    });

    dropdown.root.classList.add('shift-right');

    dropdown.on_select.add_listener(t => {
        if (t.value === 'help')
        {
            goto_option_page('help_page.html');
        }
        else if (t.value === 'highlights')
        {
            goto_option_page('highlight_editor.html');
        }
        else if (t.value === 'readings')
        {
            goto_option_page('daily_readings_page.html');
        }
        else if (t.value === 'settings')
        {
            goto_option_page('settings_page.html');
        }
        else 
        {
            utils.debug_print(`unknown sub page: ${t.value}`);
        }
    });

    return dropdown.root;
}