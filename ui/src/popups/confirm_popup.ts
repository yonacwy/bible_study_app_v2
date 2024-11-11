import * as utils from "../utils/index.js";

export type ConfirmPopupData = {
    message: string,
    yes_text?: string,
    no_text?: string,
    on_confirm: (_: MouseEvent) => void
}

const YES_BUTTON_ID = 'confirm-popup-yes-btn';
const NO_BUTTON_ID = 'confirm-popup-no-btn';
const CONFIRM_POPUP_ID = 'confirm-popup'

export function show_confirm_popup(data: ConfirmPopupData)
{
    let html = `
        <div class="popup-content">
            <p>${data.message}</p>
            <button id="${YES_BUTTON_ID}" class="yes" title="${data.yes_text ?? 'Confirm'}">Confirm</button>
            <button id="${NO_BUTTON_ID}" class="no" title="${data.no_text ?? 'Cancel'}">Cancel</button>
        </div>
    `

    document.body.appendElement('div', popup => {
        popup.id = CONFIRM_POPUP_ID;
        popup.classList.add('popup');
        popup.innerHTML = html;
    })

    document.getElementById(YES_BUTTON_ID)?.addEventListener('click', e => data.on_confirm(e));
    document.getElementById(NO_BUTTON_ID)?.addEventListener('click', _ => {
        document.getElementById(CONFIRM_POPUP_ID)?.remove();
    })
}