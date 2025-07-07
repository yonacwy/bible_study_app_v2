import { spawn_alert_popup } from "./popups/alert_select_popup.js";
import { despawn_loading_screen, spawn_loading_screen } from "./popups/loading_popup.js";
import * as utils from "./utils/index.js";

export function signin_user(): void
{
    invoke_cloud_command('signin');
}

export function signout_user(): void 
{
    invoke_cloud_command('signout');
}

export function switch_user_account(): void 
{
    invoke_cloud_command('switch_account');
}

const REFRESH_ERROR_STORAGE = new utils.storage.ValueStorage<boolean>('refresh-error-storage', false);
const HAS_ASKED_SIGN_IN_SYNC_STORAGE = new utils.storage.ValueStorage<boolean>('ask-sign-in-sync-storage', false);

export async function init_cloud_sync_for_page()
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
        else if (event_data.type === 'signed_out')
        {
            spawn_sync_disabled_popup();
        }
        else if (event_data.type === 'signout_error')
        {
            spawn_sync_disabled_error_popup(event_data.message);
        }
        else if (event_data.type === 'sync_start')
        {
            spawn_loading_screen();
        }
        else if (event_data.type === 'sync_end')
        {
            despawn_loading_screen();
        }
    });

    get_refresh_sync_error().then(refresh_error => {
        if (refresh_error !== null && !REFRESH_ERROR_STORAGE.get())
        {
            REFRESH_ERROR_STORAGE.set(true);
            spawn_refresh_sync_error_popup();
        }
    });

    let signed_in = await is_signed_in();

    // if we are signed in, set it so that we dont ask to sign in again later if when we sign out in the same session
    HAS_ASKED_SIGN_IN_SYNC_STORAGE.set(signed_in || HAS_ASKED_SIGN_IN_SYNC_STORAGE.get()); 

    let can_ask = await get_can_ask_sync();
    if (!signed_in && can_ask && !HAS_ASKED_SIGN_IN_SYNC_STORAGE.get())
    {
        HAS_ASKED_SIGN_IN_SYNC_STORAGE.set(true);
        spawn_ask_enable_sync_popup();
    }
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
    }
    |{
        type: 'signed_out'
    }
    |{
        type: 'signout_error',
        message: string,
    }
    |{
        type: 'sync_start',
    }
    |{
        type: 'sync_end',
    };

export async function listen_cloud_event(callback: (e: utils.AppEvent<CloudEvent>) => void): Promise<utils.UnlistenFn>
{
    const CLOUD_EVENT_NAME: string = 'cloud_sync_event';
    return await utils.listen_event(CLOUD_EVENT_NAME, callback);
}

export function test_sync()
{
    invoke_cloud_command('test_sync');
}

export function test_write_sync()
{
    invoke_cloud_command('test_send');
}

export function test_read_sync()
{
    invoke_cloud_command('test_receive');
}

export async function get_refresh_sync_error(): Promise<string | null>
{
    return await invoke_cloud_command('get_refresh_sync_error');
}

export async function set_can_ask_sync(value: boolean): Promise<void>
{
    return await invoke_cloud_command('set_can_ask_sync', value).then(_ => {})
}

export async function get_can_ask_sync(): Promise<boolean>
{
    let json = await invoke_cloud_command('get_can_ask_sync');
    return JSON.parse(json!);
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
    spawn_alert_popup(`Cloud Sync Denied`, `Permission for using your Google account for cloud sync has been denied`, [
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

    if (error.includes('Google Drive permissions'))
    {
        error = `You have not enabled all the permissions required for cloud sync to function. Please re-login and enable all the permissions`
    }
    else 
    {
        error = `Error when signing out from Google: ${error}`;
    }

    spawn_alert_popup(`Cloud Sync Error`, error, [
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

function spawn_sync_disabled_popup()
{
    spawn_alert_popup(`Cloud Sync Disabled`, `Cloud sync is now disabled for Ascribe, changes made will now NOT BE synced to your Google account`, [
        {
            text: `Close`,
            callback: (_, p) => p.remove(),
            color: 'normal'
        }
    ])
}

function spawn_sync_disabled_error_popup(error: string)
{
    spawn_alert_popup(`Cloud Sync Error`, `Error when signing out from Google: ${error}`, [
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
                signout_user();
            }
        }
    ]);
}

function spawn_refresh_sync_error_popup()
{
    spawn_alert_popup(`Cloud Sync Error`, `Error when trying to refresh your Google cloud session. To reenable it, please check your internet connection and restart, log back in again.`, [
        {
            text: `Close`,
            callback: (_, p) => p.remove(),
            color: 'normal'
        },
        {
            text: 'Login',
            color: 'blue',
            callback: (_, p) => {
                p.remove();
                signin_user();
            }
        }
    ]);
}

function spawn_ask_enable_sync_popup()
{
    spawn_alert_popup('Enable Sync', 'Do you want to enable cloud sync for Ascribe using Google Drive?', [
        {
            text: 'Yes',
            color: 'blue',
            callback: (_, p) => {
                p.remove();
                signin_user();
            }
        },
        {
            text: 'No',
            color: 'normal',
            callback: (_, p) => p.remove(),
        },
        {
            text: `Don't ask Again`,
            color: 'red',
            callback: (_, p) => {
                p.remove();
                set_can_ask_sync(false);
            }
        }
    ])
}

