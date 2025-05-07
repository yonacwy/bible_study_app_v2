import * as utils from "../utils/index.js";
import { init_settings_page_header, BIBLE_VERSION_DROPDOWN } from "./menu_header.js";
import * as pages from "./pages.js";
import * as settings from "../settings.js"
import { VerseRange } from "../bindings.js";
import * as bible from "../bible.js";
import * as view_states from "../view_states.js";

export type DailyReadingsPageData = {
    old_path: string,
}

export function run()
{
    let data = utils.decode_from_url(window.location.href) as DailyReadingsPageData;
    init_settings_page_header(() => BIBLE_VERSION_DROPDOWN);
    pages.init_back_button(data.old_path);
    pages.init_settings_buttons(data.old_path);
    settings.init_less_sync();
    pages.init_bible_version_dropdown();

    generate_calender();

    document.body.style.visibility = 'visible'
}

const CURRENT_DATE = new Date();

let selected_year = CURRENT_DATE.getFullYear();
let selected_month = CURRENT_DATE.getMonth();
let selected_day = CURRENT_DATE.getDate() - 1;

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function generate_calender()
{
    generate_readings();
    const CALENDER_BODY = document.getElementById('calender-table');
    if(!CALENDER_BODY) return;

    let start_date = new Date(selected_year, selected_month, 1);
    let start_day = start_date.getDay();
    let day_count = new Date(selected_year, selected_month + 1, 0).getDate();
    
    CALENDER_BODY.replaceChildren();
    CALENDER_BODY.appendElement('caption', caption => {
        caption.append_element_ex('div', ['caption-content'], caption_content => {

            caption_content.append_element_ex('button', ['image-btn', 'first'], button => {
                button.appendElement('img', img => img.src = '../images/light-arrow-left.svg');
                button.addEventListener('click', e => {
                    if(selected_month <= 0)
                    {
                        selected_month = 11;
                        selected_year--;
                    }
                    else 
                    {
                        selected_month--;
                    }
                    generate_calender();
                });
                button.title = 'Previous month';
            });

            caption_content.append_element_ex('div', ['title-container'], title_container => {
                title_container.append_element_ex('div', ['dropdown'], dropdown => {
                    dropdown.append_element_ex('div', ['calender-month'], title => title.innerHTML = MONTH_NAMES[selected_month]);
                    dropdown.append_element_ex('div', ['dropdown-content'], content => {
                        MONTH_NAMES.forEach((m, i) => {
                            content.append_element_ex('div', ['dropdown-option'], option => {
                                option.innerHTML = m;
                                option.addEventListener('click', e => {
                                    selected_month = i;
                                    selected_day = 0;
                                    generate_calender();
                                })
                            });
                        });
                    });
                });
    
                title_container.append_element_ex('div', ['calender-year'], year_title => {
                    year_title.innerHTML = `${selected_year}`;
                });

                let reset_button = utils.create_image_button(title_container, '../images/light-arrow-rotate-right.svg', _ => {
                    selected_year = CURRENT_DATE.getFullYear();
                    selected_month = CURRENT_DATE.getMonth();
                    selected_day = CURRENT_DATE.getDate() - 1;
                    generate_calender();
                });

                reset_button.button.title = 'Go to current date'
            });

            caption_content.append_element_ex('button', ['image-btn', 'last'], button => {
                button.appendElement('img', img => img.src = '../images/light-arrow-right.svg');
                button.addEventListener('click', e => {
                    if(selected_month >= 11)
                    {
                        selected_month = 0;
                        selected_year++;
                    }
                    else 
                    {
                        selected_month++;
                    }
                    generate_calender();
                });
                button.title = 'Next month';
            });
        });
    })
    // Table header
    CALENDER_BODY.appendElement('tr', hrow => {
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(name => {
            hrow.appendElement('th', th => th.innerHTML = name);
        });
    });

    let current_row = CALENDER_BODY.appendChild(document.createElement('tr')) as HTMLTableRowElement;
    for(let i = 0; i < start_day; i++)
    {
        current_row.appendElement('td', td => td.innerHTML = '&nbsp;');
    }

    let row_index = start_day;
    for(let i = 0; i < day_count; i++)
    {
        current_row.appendElement('td', td => {
            td.innerHTML = `${i + 1}`;
            td.classList.add('hoverable');

            if(i === selected_day)
                td.classList.add('selected-date');

            if(selected_year === CURRENT_DATE.getFullYear() && 
               selected_month === CURRENT_DATE.getMonth()   && 
               i !== selected_day                           && 
               i === CURRENT_DATE.getDate() - 1)
            {
                td.classList.add('current-date');
            }

            td.addEventListener('click', e => {
                selected_day = i;
                generate_calender();
            })
        });

        row_index++;
        if(row_index >= 7)
        {
            row_index = 0;
            current_row = CALENDER_BODY.appendChild(document.createElement('tr')) as HTMLTableRowElement;
        }
    }

    for(let i = row_index; i < 7; i++)
    {
        current_row.appendElement('td', td => td.innerHTML = '&nbsp;');
    }
}

const READING_PLANS = [
    {
        name: "Robert Roberts",
        description: "Test Description for Robert Roberts",
        id: 0,
    },
    {
        name: "Proverbs",
        description: "Test Description for Proverbs",
        id: 1,
    },
    {
        name: "Bible in One Year",
        description: "Test Description for Bible in One Year",
        id: 2,
    }
];

async function generate_readings()
{
    generate_readings_dropdown();
    let readings_content = document.getElementById('reading-plan-content');

    if(!readings_content) return;

    let readings = await get_readings(selected_month, selected_day);
    
    readings_content.replaceChildren();
    readings.forEach(r => {
        readings_content.appendElement('li', li => {

            li.innerHTML = '';
            if(r.prefix !== null)
            {
                if (r.prefix === 1) li.innerHTML += '1st ';
                else if (r.prefix === 2) li.innerHTML += '2nd ';
                else if (r.prefix === 3) li.innerHTML += '3rd ';
                else li.innerHTML += `${r.prefix}th `;
            }

            li.innerHTML += `${ bible.shorten_book_name(r.book) } ${r.chapter + 1}`;
            if(r.range !== null)
            {
                li.innerHTML += `:${r.range.start + 1}-${r.range.end + 1}`;
            }

            li.addEventListener('click', async e => {
                let book = await bible.get_book_index(r.prefix, r.book);
                if(book === null) return; // make sure nothing breaks when in debug

                let book_view = (await bible.get_bible_view())[book];
                if(book_view.chapter_count <= r.chapter) return; // make sure nothing breaks when in debug


                view_states.push_section({
                    book: book,
                    chapter: r.chapter,
                    verse_range: r.range
                });
                view_states.goto_current_view_state();
            })
        })
    })
}

async function generate_readings_dropdown()
{
    let title = document.getElementById('reading-plan-title');
    let dropdown_content = document.getElementById('reading-plan-dropdown-content');

    if (!title || !dropdown_content) return;

    dropdown_content.replaceChildren();
    let selected_reading_id = await get_selected_reading();
    let current_reading = READING_PLANS.find(r => r.id === selected_reading_id) ?? READING_PLANS[0];

    title.innerHTML = current_reading.name;

    READING_PLANS.forEach(r => {
        dropdown_content.append_element_ex('div', ['dropdown-option'], option => {
            option.innerHTML = r.name;
            option.addEventListener('click', e => {
                set_selected_reading(r.id).then(() => {
                    generate_readings();
                })
            })
        });
    })
}

export type Reading = {
    prefix: number | null,
    book: string,
    chapter: number,
    range: VerseRange | null
};

export async function get_readings(month: number, day: number): Promise<Reading[]>
{
    return await utils.invoke('get_reading', { month: month, day: day, selected_reading: `"${await get_selected_reading()}"` });
}

export async function get_selected_reading(): Promise<number>
{
    return await utils.invoke('get_selected_reading', {});
}

export async function set_selected_reading(reading: number)
{
    return await utils.invoke('set_selected_reading', { selected_reading: reading });
}