import * as utils from "../utils/index.js";
import * as highlights from "../highlights.js";
import { show_error_popup } from "../popups/error_popup.js";
import { HighlightCategory } from "../bindings.js";
import * as confirm_popup from "../popups/confirm_popup.js";
import * as header_utils from "./menu_header.js";
import * as pages from "./pages.js";
import * as settings from "../settings.js"
import { TextEditor } from "../text_editor/index.js";

export type HighlightEditorData = {
    old_path: string
}

export async function run()
{
    let data = utils.decode_from_url(window.location.href) as HighlightEditorData;

    editing_id = null;
    deleting_id = null;

    header_utils.init_settings_page_header(() => {
        return `
        <button class="image-btn" id="new-btn" title="Create new highlight">
            <img src="../images/light-plus.svg">
        </button>
        `;
    });

    pages.init_back_button(data.old_path);
    pages.init_settings_buttons(data.old_path);
    settings.init_less_sync();

    render_categories(on_delete, on_edit);

    utils.on_click('new-btn', (e) => {
        utils.set_display('highlight-popup', 'flex');
    });

    utils.on_click('submit-btn', on_submit);

    utils.on_click('cancel-submit-btn', e => {
        utils.set_display('highlight-popup', 'none');
    });

    utils.init_sliders();
    init_view_toggle();

    let editor_node = spawn_highlight_editor_popup();
    document.body.appendChild(editor_node);
    editor_node.style.display = 'flex';

    document.body.style.visibility = 'visible';
}

let editing_id: string | null = null;
function on_edit(id: string)
{
    highlights.get_categories().then(categories => {
        let category: HighlightCategory = categories[id];
        let color = utils.color_to_hex(category.color);
        utils.set_value('color-in', color);
        utils.set_value('name-in', category.name);
        utils.set_value('description-in', category.description);

        utils.set_value('priority-in', category.priority.toString());

        editing_id = category.id;
        utils.set_display('highlight-popup', 'flex');
        utils.update_sliders();
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

function on_submit(_e: Event)
{
    let color = utils.read_value('color-in') ?? "#FFFFFF";
    let name = utils.read_value('name-in') ?? "";
    let description = utils.read_value('description-in') ?? "";
    let priority = +(utils.read_value('priority-in') ?? 0) ;

    let was_error = false;

    const NAME_MIN_LENGTH = 3;
    const NAME_MAX_LENGTH = 20;
    if(name.length < 3)
    {
        was_error = true;
        show_error_popup('name-err-msg', true, `Name must be at least ${NAME_MIN_LENGTH} characters long.`);
    }
    else if(name.length > NAME_MAX_LENGTH)
    {
        was_error = true;
        show_error_popup('name-err-msg', true, `Cant be longer than ${NAME_MAX_LENGTH} characters long.`);
    }
    else if(!utils.is_valid_title(name))
    {
        was_error = true;
        show_error_popup('name-err-msg', true, `Name must contain only letters, numbers, and spaces`);
    }

    if(!was_error)
    {
        if(editing_id === null)
        {
            highlights.create_category(color, name, description, 'markdown', priority.toString());
        }
        else 
        {
            highlights.set_category(editing_id, color, name, description, 'markdown', priority);
        }
        utils.set_display('highlight-popup', 'none');
        location.reload();
        editing_id = null;
    }
}

enum MdState 
{
    Viewing = 'v',
    Editing = 'e',
}

function init_view_toggle()
{
    let current_state: MdState = MdState.Editing;

    const button = document.getElementById('view-toggle-btn');
    const image = button?.getElementsByTagName('img')[0];
    const text_input = document.getElementById('description-in') as HTMLTextAreaElement | null;
    const text_view = document.getElementById('description-view');

    if(!button || !image || !text_input || !text_view) return;

    function opposite_state(state: MdState): MdState
    {
        if (state == MdState.Editing) return MdState.Viewing;
        return MdState.Editing;
    }

    const BUTTON_DATA = {
        'v': {
            image: '../images/light-text.svg',
            title: 'Enter view mode',
            view: 'block',
            edit: 'none',
        },
        'e': {
            image: '../images/light-eye.svg',
            title: 'Enter edit mode',
            view: 'none',
            edit: 'block',
        }
    }

    let set_data = (state: MdState) =>
    {
        let data = BUTTON_DATA[state];
        button.title = data.title;
        image.src = data.image;
        text_input.style.display = data.edit;
        text_view.style.display = data.view;
    }

    button.addEventListener('click', e => {
        current_state = opposite_state(current_state);

        if(current_state === MdState.Viewing)
        {
            text_view.innerHTML = utils.render_markdown(text_input.value);
        }
        else 
        {
            text_view.innerHTML = '';
        }

        set_data(current_state);
    });

    set_data(current_state);
}

export function render_categories(on_delete: (id: string) => void, on_edit: (id: string) => void)
{
    utils.invoke('get_highlight_categories', {}).then((categories_json: string) => {
        let container = document.getElementById('highlights');
        if (container === null) return;
        let categories = JSON.parse(categories_json);

        if (categories.length == 0)
        {
            let messageDiv = document.createElement('div');
            messageDiv.innerHTML = "No Highlights created";
            return;
        }

        for(let id in categories)
        {
            let category: HighlightCategory = categories[id];
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

                    if (!utils.is_empty_str(description))
                    {
                        content_div.append_element_ex('div', ['highlight-description'], desc => desc.innerHTML = utils.render_markdown(description));
                    }


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

function spawn_highlight_editor_popup(): HTMLElement
{
    let background = utils.spawn_element('div', ['highlight-editor-popup'], b => {
        let editor_section = utils.spawn_element('div', ['editor-section'], s => {

            utils.spawn_element('div', ['title-section'], title => {
                utils.spawn_element('input', [], input => {
                    input.type = 'text';
                    input.placeholder = 'Name';
                }, title);

                let btn = utils.spawn_image_button(utils.images.X_MARK, c => {
                    utils.debug_print('close button clicked');
                }, title);

                btn.button.title = 'Save and Close'
            }, s);

            let editor = new TextEditor({
                id: 'desc-editor',
                parent: s,
                has_misc_options: false,
            });

            editor.load_save({
                data_type: 'markdown',
                source: 'This is a **test** highlight *description*'
            });

            utils.spawn_element('div', ['slider-section'], s => {
                let slider = utils.spawn_slider({
                    min: 0,
                    max: 10,
                    step: 1,
                    default: 0,
                    classes: [],
                });

                utils.spawn_image_button(utils.images.HISTORY_VERTICAL, e => {
                    slider.set_value(0);
                });
            }, s);
        }, b);
    })

    

    return background;
}