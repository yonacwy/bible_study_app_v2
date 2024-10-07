import * as utils from "../utils.js";
import * as highlights from "../highlights.js";
import { show_error_popup } from "../error_popup.js";
export async function run() {
    editing_id = null;
    deleting_id = null;
    highlights.render_catagories(on_delete, on_edit);
    utils.on_click('new-btn', (e) => {
        utils.set_display('highlight-popup', 'flex');
    });
    utils.on_click('submit-btn', on_submit);
    let data = utils.decode_from_url(window.location.href);
    init_confirm_popup();
    utils.on_click('back-btn', e => {
        window.location.href = data.old_path;
    });
    document.body.style.visibility = 'visible';
}
let editing_id = null;
function on_edit(id) {
    highlights.get_catagories().then(catagories => {
        let category = catagories[id];
        let color = utils.color_to_hex(category.color);
        utils.set_value('color-in', color);
        utils.set_value('name-in', category.name);
        utils.set_value('description-in', category.description);
        utils.set_value('priority-in', category.priority);
        editing_id = category.id;
        utils.set_display('highlight-popup', 'flex');
    });
}
let deleting_id = null;
function on_delete(id) {
    deleting_id = id;
    utils.set_display('confirm-popup', 'flex');
}
function on_submit(_e) {
    let color = utils.read_value('color-in') ?? "#FFFFFF";
    let name = utils.read_value('name-in') ?? "";
    let description = utils.read_value('description-in') ?? "";
    let priority = +(utils.read_value('priority-in') ?? 0);
    let was_error = false;
    const NAME_MIN_LENGTH = 3;
    const NAME_MAX_LENGTH = 20;
    if (name.length < 3) {
        was_error = true;
        show_error_popup('name-err-msg', true, `Name must be at least ${NAME_MIN_LENGTH} characters long.`);
    }
    else if (name.length > NAME_MAX_LENGTH) {
        was_error = true;
        show_error_popup('name-err-msg', true, `Cant be longer than ${NAME_MAX_LENGTH} characters long.`);
    }
    else if (!utils.is_valid_title(name)) {
        was_error = true;
        show_error_popup('name-err-msg', true, `Name must contain only letters, numbers, and spaces`);
    }
    if (!was_error) {
        if (editing_id === null) {
            highlights.create_category(color, name, description, priority.toString());
        }
        else {
            highlights.set_category(editing_id, color, name, description, priority);
        }
        utils.set_display('highlight-popup', 'none');
        location.reload();
        editing_id = null;
    }
}
function init_confirm_popup() {
    utils.on_click('confirm-btn', (e) => {
        if (deleting_id != null) {
            utils.invoke('remove_highlight_category', { id: deleting_id });
            if (highlights.get_selected_highlight() === deleting_id) {
                highlights.set_selected_highlight(null);
            }
        }
        utils.set_display('confirm-popup', 'none');
        location.reload();
    });
    utils.on_click('cancel-delete-btn', (e) => {
        utils.set_display('confirm-popup', 'none');
        deleting_id = null;
    });
}
