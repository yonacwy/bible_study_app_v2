import { spawn_alert_popup } from "../popups/alert_select_popup.js";
import * as utils from "./index.js";

export type PromptData = {
    title: string,
    message: string,
}

export async function setup_prompt_listener()
{
    await utils.listen_event<PromptData>('prompt-user', async e => {
        let data = e.payload;
        spawn_alert_popup(data.title, data.message, [
            {
                text: 'Allow',
                color: 'blue',
                callback: (_, p) => {
                    p.remove();
                    invoke_response(true);
                }
            },
            {
                text: 'Deny',
                color: 'red',
                callback: (_, p) => {
                    p.remove();
                    invoke_response(false);
                }
            }
        ])
    })
}

function invoke_response(value: boolean)
{
    utils.invoke('receive_prompt_response', { value: value });
}