import * as utils from "../utils/index.js";
import * as highlights from "../highlights.js";
import { show_error_popup } from "../popups/error_popup.js";
import { HighlightCategory } from "../bindings.js";
import * as confirm_popup from "../popups/confirm_popup.js";
import * as header_utils from "./menu_header.js";
import * as pages from "./pages.js";
import * as settings from "../settings.js"

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

    highlights.render_categories(on_delete, on_edit);

    utils.on_click('new-btn', (e) => {
        utils.set_display('highlight-popup', 'flex');
    });

    utils.on_click('submit-btn', on_submit);

    utils.on_click('cancel-submit-btn', e => {
        utils.set_display('highlight-popup', 'none');
    });

    utils.init_sliders();
    init_view_toggle();

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
                if(highlights.SELECTED_HIGHLIGHT.get() === deleting_id)
                {
                    highlights.SELECTED_HIGHLIGHT.set(null);
                }
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
            highlights.create_category(color, name, description, priority.toString());
        }
        else 
        {
            highlights.set_category(editing_id, color, name, description, priority);
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