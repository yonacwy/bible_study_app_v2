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

export async function setup_prompt_listener()
{
    await utils.listen_event<PromptData>('prompt-user', async e => {
        let data = e.payload;

        let options: AlertPopupOption[] = data.options.map((o, i) => {
            return {
                text: o.name,
                tooltip: o.tooltip ?? undefined,
                color: o.color,
                callback: (_, p) => {
                    p.remove();
                    invoke_response(i);
                }
            }
        })

        spawn_alert_popup(data.title, data.message, options)
    })
}

function invoke_response(value: number)
{
    utils.invoke('receive_prompt_response', { value: value });
}