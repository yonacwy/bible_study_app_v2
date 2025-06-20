import * as utils from "../utils/index.js";

export type AlertPopupOption =
{
    color: 'normal' | 'red' | 'blue',
    text: string,
    callback: (e: MouseEvent, p: HTMLElement) => void,
}

export function spawn_alert_popup(message: string, options: AlertPopupOption[])
{
    utils.spawn_element('div', ['alert-popup'], background => {
        utils.spawn_element('div', ['alert-popup-content'], content => {
            
            utils.spawn_element('div', ['alert-text'], text => {
                text.innerHTML = message;
            }, content);

            utils.spawn_element('div', ['button-container'], container => {
                options.forEach(o => {
                    utils.spawn_element('button', ['button', o.color], button => {
                        button.innerHTML = o.text;
                        button.addEventListener('click', e => o.callback(e, background));
                    }, container);
                })
            }, content)

        }, background);
    }, document.body)
}