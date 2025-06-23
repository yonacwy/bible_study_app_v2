import { spawn_alert_popup } from "./popups/alert_select_popup.js";
import * as utils from "./utils/index.js";

export function signin_user()
{
    return invoke_cloud_command('signin')
}

export function init_cloud_sync_for_page()
{
    listen_cloud_event(e => {
        let event_data = e.payload;
        if (event_data.type === 'signed_in')
        {
            spawn_sync_enabled_popup();
        }
        else if (event_data.type === 'signin_denied')
        {
            spawn_sync_denied_popup()
        }
        else if (event_data.type === 'signin_error')
        {
            spawn_sync_error_popup(event_data.message);
        }
    })
}

export type GoogleUserInfo = {
    id: string,
    email: string | null,
    name: string | null,
    given_name: string | null,
    family_name: string | null,
    picture: string | null, // URL
    email_verified: boolean | null,
    locale: string | null,
}

export async function get_user_info(): Promise<GoogleUserInfo | null>
{
    let json = await invoke_cloud_command('account_info');
    return JSON.parse(json!);
}

export async function is_signed_in(): Promise<boolean>
{
    let json = await invoke_cloud_command('is_signed_in');
    utils.debug_print(json!);
    return JSON.parse(json!);
}

export type CloudEvent = 
    |{
        type: 'signed_in'
    }
    |{
        type: 'signin_denied'
    }
    |{
        type: 'signin_error',
        message: string,
    };

export async function listen_cloud_event(callback: (e: utils.AppEvent<CloudEvent>) => void): Promise<utils.UnlistenFn>
{
    const CLOUD_EVENT_NAME: string = 'cloud_sync_event';
    return await utils.listen_event(CLOUD_EVENT_NAME, callback);
}

async function invoke_cloud_command(cmd: string, args?: any): Promise<string | null>
{
    let a: string | null = null;
    if(args !== undefined)
    {
        a = JSON.stringify(args);
    }
    return await utils.invoke('run_cloud_command', { command: cmd, args: a }) as string | null;
}

function spawn_sync_enabled_popup()
{
    spawn_alert_popup(`Cloud Sync Enabled`, `Cloud sync is now enabled for Ascribe, changes made will now be synced to your Google account`, [
        {
            text: `Close`,
            callback: (_, p) => p.remove(),
            color: 'normal'
        }
    ])
}

function spawn_sync_denied_popup()
{
    spawn_alert_popup(`Cloud Sync Denied`, `Permission for using your Google account for cloud sync as be denied`, [
        {
            text: `Close`,
            callback: (_, p) => p.remove(),
            color: 'normal'
        },
        {
            text: 'Try again',
            color: 'blue',
            callback: (_, p) => {
                p.remove();
                signin_user();
            }
        }
    ]);
}

function spawn_sync_error_popup(error: string)
{
    spawn_alert_popup(`Cloud Sync Error`, `Error when syncing to cloud: ${error}.\n If you do not understand this error, please contact the developer as that is not good.`, [
        {
            text: `Close`,
            callback: (_, p) => p.remove(),
            color: 'normal'
        },
        {
            text: 'Try again',
            color: 'blue',
            callback: (_, p) => {
                p.remove();
                signin_user();
            }
        }
    ]);
}

