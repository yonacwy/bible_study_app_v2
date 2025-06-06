import * as utils from "../utils/index.js";
import * as bible from "../bible.js";
import { spawn_chapter_selection_dropdown } from "../chapter_selector.js";

export function get_header(): HTMLElement
{
    return document.getElementsByTagName('header')[0];
}

export async function init_main_page_header(args: {
    extra?: (e: HTMLElement) => void,
    on_chapter_select: (name: string, number: number) => void,
})
{
    let header = get_header();
    header.appendChild(await spawn_version_dropdown())
    header.appendChild(await spawn_chapter_selection_dropdown(args.on_chapter_select))

    header.innerHTML = `
        <div class="searchbar" style="position: relative;">
            <input type="text" id="search-input">
            <button id="search-btn" class="image-btn" title="Search the bible">
                <img src="../images/light-magnifying-glass.svg">
            </button> 
            <div class="error-popup" id="error-message"></div>
        </div>
        <button class="image-btn" id="back-btn" title="Go back">
            <img src="../images/light-arrow-turn-left.svg">
        </button>
        <button class="image-btn" id="forward-btn" title="Go forward">
            <img src="../images/light-arrow-turn-right.svg">
        </button>
        ${SETTINGS_DROPDOWN}
    `;

    if(extra !== undefined)
    {
        extra(header);
    }
}

export function init_settings_page_header(middle: () => HTMLElement[], on_back_clicked: () => void, old_path: string)
{
    let header = get_header();
    utils.create_image_button(header, utils.images.BACKWARD, on_back_clicked);
    header.append(...middle());
    header.appendChild(spawn_settings_dropdown(old_path))
}

function spawn_searchbar(): HTMLElement
{
    const SEARCH_ERROR_ID = 'search-error-id';

    return utils.spawn_element('div', ['searchbar'], searchbar => {
        searchbar.style.position = 'relative';
        let input = searchbar.append_element('input', i => i.type = 'text');
        
        let button = utils.spawn_image_button_args({
            image: utils.images.MAGNIFYING_GLASS,
            title: 'Search the Bible',
            parent: searchbar,
        });

        let error_popup = searchbar.append_element_ex('div', ['error-popup'], err => {
            err.id = SEARCH_ERROR_ID;
        });
    })
}

async function spawn_version_dropdown(): Promise<HTMLElement>
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

function spawn_chapter_selector()
{

}