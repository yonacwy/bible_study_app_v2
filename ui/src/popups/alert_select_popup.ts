import { options } from "less";
import * as utils from "../utils/index.js";
import { color } from "../rendering/bible_rendering.js";

export type AlertPopupOption =
{
    color: 'normal' | 'red' | 'blue',
    text: string,
    tooltip?: string,
    callback: ((e: MouseEvent) => void) | null,
}

export function spawn_alert_popup(title_text: string, message: string, options: AlertPopupOption[])
{
    utils.spawn_element('div', ['alert-popup'], background => {
        utils.spawn_element('div', ['alert-popup-content'], content => {

            utils.spawn_element('div', ['alert-title'], title => {
                title.innerHTML = title_text;
            }, content);
            
            utils.spawn_element('div', ['alert-text'], text => {
                text.innerHTML = message;
            }, content);

            utils.spawn_element('div', ['button-container'], container => {
                options.forEach(o => {
                    utils.spawn_element('button', ['button', o.color], button => {
                        button.innerHTML = o.text;
                        button.addEventListener('click', e => {
                            if(o.callback)
                            {
                                o.callback(e);
                            }
                            background.remove();
                            display_only_top_alert();
                        });
                        button.title = o.tooltip ?? '';
                    }, container);
                })
            }, content)

        }, background);
    }, document.body);

    display_only_top_alert();
}

export function spawn_alert_popup_basic(title_text: string, message: string, on_ok?: () => void)
{
    spawn_alert_popup(title_text, message, [
        {
            color: 'blue',
            text: 'Ok',
            callback: (_) => {
                if (on_ok) { on_ok() }
            },
        }
    ]);
}

function display_only_top_alert() 
{
    let alerts = Array.from(document.getElementsByClassName('alert-popup')).map(e => e as HTMLElement);
    alerts.forEach(element => {
        element.style.display = 'none';
    });

    if (alerts.length > 0) 
        {
        alerts[alerts.length - 1].style.display = 'block';
    }
}