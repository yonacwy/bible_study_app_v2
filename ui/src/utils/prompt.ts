import { AlertPopupOption, spawn_alert_popup } from "../popups/alert_select_popup.js";
import * as utils from "./index.js";

export type OptionColor = "red" | "blue" | "normal";

export type OptionData = {
    name: string,
    tooltip: string | null,
    color: OptionColor,
}

export type PromptData = {
    title: string,
    message: string,
    options: OptionData[]
}

export async function setup_prompt_listener(): Promise<void>
{
    return utils.listen_event<PromptData>('prompt-user', async e => {
        let data = e.payload;

        let options: AlertPopupOption[] = data.options.map((o, i) => {
            return {
                text: o.name,
                tooltip: o.tooltip ?? undefined,
                color: o.color,
                callback: _ => invoke_response(i)
            }
        })

        utils.debug_print(`prompting = ${data.title}`);

        spawn_alert_popup(data.title, data.message, options)
    }).then(_ => {

        window.addEventListener('beforeunload', () => {
            utils.invoke('frontend_unloading', {});
        });

        return utils.invoke('frontend_ready', {});
    })

}

function invoke_response(value: number)
{
    utils.invoke('receive_prompt_response', { value: value });
}