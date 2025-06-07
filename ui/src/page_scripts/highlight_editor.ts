import * as utils from "../utils/index.js";
import * as highlights from "../highlights.js";
import { show_error_popup } from "../popups/error_popup.js";
import { HighlightCategories, HighlightCategory } from "../bindings.js";
import * as confirm_popup from "../popups/confirm_popup.js";
import * as header_utils from "./menu_header.js";
import * as pages from "./pages.js";
import * as settings from "../settings.js"
import { TextEditor } from "../text_editor/index.js";
import { render_note_data } from "../rendering/note_rendering.js";
import * as view_states from "../view_states.js";

export type HighlightEditorData = {
    old_path: string,
    should_make_new?: boolean,
}

export function goto_highlight_editor_page(should_make_new: boolean)
{
    window.location.href = utils.encode_to_url('highlight_editor.html', {
        old_path: window.location.href,
        should_make_new,
    } as HighlightEditorData);
}

export async function run()
{
    let data = utils.decode_from_url(window.location.href) as HighlightEditorData;

    deleting_id = null; 

    header_utils.init_settings_page_header({
        middle: [
            utils.spawn_image_button_args({
                image: utils.images.PLUS,
                on_click: _ => {
                    let popup = spawn_highlight_editor_popup(null);
                    document.body.appendChild(popup);
                },
                title: 'Create new highlight',
            }).button as HTMLElement
        ],
        on_back_clicked: () => {
            window.location.href = data.old_path;
        },
        old_path: data.old_path,
    });

    settings.init_less_sync();

    let on_search = (msg: string) => {
        view_states.push_search_query(msg).then(success => {
            if (success)
            {
                view_states.goto_current_view_state();
            }
        })
    }

    render_categories(on_delete, on_edit, on_search);

    utils.init_sliders();

    document.body.style.visibility = 'visible';

    if (data.should_make_new ?? false)
    {
        let popup = spawn_highlight_editor_popup(null);
        document.body.appendChild(popup);
    }
}

function on_edit(id: string)
{
    highlights.get_categories().then(categories => {
        let category: HighlightCategory = categories[id];
        let popup = spawn_highlight_editor_popup(category);
        document.body.appendChild(popup);
    })
}

let deleting_id: string | null = null;
function on_delete(id: string)
{
    deleting_id = id;
    confirm_popup.show_confirm_popup({
        message: 'Are you sure you want to delete this highlight? (This will remove all references to it)',
        yes_text: 'Delete highlight',
        no_text: 'Cancel delete highlight',
        on_confirm: () => {
            if (deleting_id != null)
            {
                utils.invoke('remove_highlight_category', { id: deleting_id });
            }

            location.reload();
        }
    })
}

export function render_categories(on_delete: (id: string) => void, on_edit: (id: string) => void, on_search: (msg: string) => void)
{
    utils.invoke('get_highlight_categories', {}).then((categories_json: string) => {
        let container = document.getElementById('highlights');
        if (container === null) return;
        let categories = JSON.parse(categories_json) as HighlightCategories;

        if (Object.values(categories).length === 0)
        {
            let messageDiv = document.createElement('div');
            messageDiv.innerHTML = "No Highlights created";
            return;
        }

        let category_array = Object.values(categories).sort((a, b) => {
            if (a.name === b.name)
            {
                return a.id > b.id ? 1 : -1;
            }

            return a.name > b.name ? 1 : -1;
        });

        for(let i = 0; i < category_array.length; i++)
        {
            let category = category_array[i];
            let name = category.name;
            let description = category.description;
            let color = category.color;
            let priority = category.priority;

            container.append_element_ex('div', ['highlight'], highlight_div => {
                highlight_div.append_element_ex('div', ['color-bar'], color_bar => {
                    color_bar.style.backgroundColor = utils.color_to_hex(color);
                });

                highlight_div.append_element_ex('div', ['highlight-content'], content_div => {
                    content_div.append_element('h2', header => header.innerHTML = name);

                    content_div.append_element_ex('div', ['highlight-description'], desc => {
                        render_note_data({
                            text: description,
                            source_type: category.source_type,
                        }, on_search, desc);

                        if (desc.innerText.length === 0)
                        {
                            desc.hide(true);
                        }
                    });

                    content_div.append_element('p', p => {
                        p.innerHTML = `<span class="priority">Priority:</span> ${priority}`;
                    });

                    content_div.append_element_ex('div', ['highlight-button-container'], button_container => {
                        let edit_btn = utils.create_image_button(button_container, '../images/light-pencil.svg', e => {
                            on_edit(category.id);
                        });
                        edit_btn.button.title = 'Edit category';

                        let delete_btn = utils.create_image_button(button_container, '../images/light-trash-can.svg', e => {
                            on_delete(category.id);
                        });
                        delete_btn.button.title = 'Delete category';
                    })
                });
            });
        };
    });
}

const HL_NAME_INPUT_ID: string = 'hl-name-input';
const HL_COLOR_INPUT_ID: string = 'hl-color-input';
const HL_PRIORITY_INPUT_ID: string = 'hl-priority-input';

function spawn_highlight_editor_popup(category: HighlightCategory | null): HTMLElement
{
    let was_edited = false;
    let background = utils.spawn_element('div', ['highlight-editor-popup'], background => {
        utils.spawn_element('div', ['editor-section'], s => {

            // title
            utils.spawn_element('div', ['title-section'], title => {
                utils.spawn_element('div', ['name-input'], d => {
                    d.style.position = 'relative';
                    d.style.flex = '1';
                    utils.spawn_element('input', [], input => {
                        input.type = 'text';
                        input.placeholder = 'Name';
                        input.value = category?.name ?? '';
                        input.id = HL_NAME_INPUT_ID;
                        input.addEventListener('input', _ => was_edited = true)
                    }, d);

                    utils.spawn_element('div', ['error-popup'], err => {
                        err.id = 'name-error-message';
                    }, d); 
                }, title);

                utils.spawn_element('input', [], color => {
                    color.type = 'color';
                    if (category)
                    {
                        color.value = utils.color_to_hex(category.color);
                    }
                    else 
                    {
                        color.value = '#FFD700';
                    }

                    color.id = HL_COLOR_INPUT_ID;
                    color.addEventListener('input', _ => was_edited = true);
                }, title);

                utils.spawn_image_button_args({
                    image: utils.images.SAVE,
                    title: 'Save and Close',
                    classes: ['save-btn'],
                    parent: title,
                    on_click: _ => save_highlight(),
                });

                let cancel_btn = utils.spawn_image_button(utils.images.X_MARK, c => {
                    if(!was_edited)
                    {
                        background.remove();
                        return;
                    }

                    confirm_popup.show_confirm_popup({
                        message: 'Are you sure you want to close the editor without saving?',
                        on_confirm: _ => {
                            background.remove();
                        }
                    })
                }, title);

                cancel_btn.button.title = 'Cancel'
            }, s);

            // slider
            utils.spawn_element('div', ['slider-section'], s => {
                let priority = category?.priority ?? 1;
                let slider_text = utils.spawn_element('div', ['slider-text'], t => {
                    t.innerHTML = `Priority: ${priority}`
                }, s);

                let slider = utils.spawn_slider({
                    min: 1,
                    max: 10,
                    step: 1,
                    default: priority,
                    classes: [],
                    parent: s,
                    id: HL_PRIORITY_INPUT_ID,
                });

                slider.on_input.add_listener(_ => {
                    was_edited = true;
                });

                slider.on_input.add_listener(v => {
                    slider_text.innerHTML = `Priority: ${v}`;
                })

                utils.spawn_image_button(utils.images.HISTORY_VERTICAL, e => {
                    slider.set_value(1);
                }, s);
            }, s);

            // Text editor
            let editor = new TextEditor({
                id: 'desc-editor',
                parent: s,
                has_misc_options: false,
                on_ref_clicked: (ref) => {

                    confirm_popup.show_confirm_popup({
                        message: 'Do you want to exit this highlight? All data changed will not be saved.',
                        on_confirm: () => {
                            view_states.push_search_query(ref).then(success => {
                                if (success)
                                {
                                    view_states.goto_current_view_state();
                                }
                            });
                        }
                    });
                }
            });

            editor.on_save.add_listener(_ => {
                was_edited = true;
            })

            editor.load_save({
                data_type: category?.source_type ?? 'markdown',
                source: category?.description ?? ''
            });

            function save_highlight()
            {
                editor.get_save();

                let name = utils.read_value(HL_NAME_INPUT_ID)!;

                let error = validate_title(name);
                if(error)
                {
                    show_error_popup('name-error-message', true, error);
                    return;
                }

                let { data_type, source } = editor.get_save();
                let priority = utils.read_value(HL_PRIORITY_INPUT_ID)!;
                let id = category?.id ?? null;
                let color = utils.read_value(HL_COLOR_INPUT_ID)!; 

                if (id === null) // creating a new highlight
                {
                    highlights.create_category(color, name, source, data_type, priority);
                }
                else 
                {
                    highlights.set_category(id, color, name, source, data_type, +priority);
                }

                background.remove();
                location.reload();
            }
        }, background);
    })

    

    return background;
}

function validate_title(title: string): string | null
{
    const NAME_MIN_LENGTH = 3;
    const NAME_MAX_LENGTH = 20;
    if(title.length < 3)
    {
        return `Name must be at least ${NAME_MIN_LENGTH} characters long.`;
    }
    else if(title.length > NAME_MAX_LENGTH)
    {
        return `Cant be longer than ${NAME_MAX_LENGTH} characters long.`;
    }
    else if(!utils.is_valid_title(title))
    {
        return `Name must contain only letters, numbers, and spaces`;
    }
    else 
    {
        return null;
    }
}