use std::thread;

use cloud_sync::{utils::{AppInfo, ClientInfo}, DriveSyncClient, GoogleUserInfo};
use serde::{Deserialize, Serialize};

use crate::{cloud_sync::{CloudEvent, RemoteSave, APP_ID, CANCELLED_PAGE_SRC, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, SUCCESS_PAGE_SRC, SYNC_FILE_NAME, TIMEOUT_MS}, utils::Shared};


#[derive(Debug)]
pub struct CloudSyncState
{
    drive_client: Shared<Option<DriveSyncClient>>,
    loading_error: Option<String>,
    pub can_ask_enable_sync: bool,
}

impl CloudSyncState
{
    pub fn signin(&mut self, on_event: impl Fn(CloudEvent) + Send + Sync + 'static) -> Result<(), String>
    {
        if self.is_signed_in()
        {
            return Err(format!("Cannot sign in, as the user is already signed in"))
        }
        
        self.spawn_signin_thread(on_event);
        Ok(())
    }

    pub fn signout(&mut self) -> Result<(), String>
    {
        let Some(client) = self.drive_client.get().take() else {
            return Err(format!("Cannot sign out, as the user is not signed in"));
        };

        client.signout()
    }

    pub fn is_signed_in(&self) -> bool
    {
        self.drive_client.get().is_some()
    }

    pub fn get_user_info(&self) -> Option<GoogleUserInfo>
    {
        self.drive_client.get().as_ref().map(|c| c.user_info().clone())
    }

    pub fn get_save(&self) -> CloudSyncStateSave
    {
        let refresh_token = self.drive_client.get().as_ref().map(|d| d.refresh_token().to_owned());

        CloudSyncStateSave { 
            refresh_token,
            can_ask_enable_sync: self.can_ask_enable_sync,
        }
    }

    pub fn from_save(save: CloudSyncStateSave) -> Self 
    {
        if let Some(refresh_token) = save.refresh_token
        {
            let client = ClientInfo { id: CLIENT_ID.into(), secret: CLIENT_SECRET.into() };
            let app_info = AppInfo { app_id: APP_ID.into(), sync_file_name: SYNC_FILE_NAME.into() };

            match DriveSyncClient::from_refresh_token(client, app_info, refresh_token)
            {
                Ok(ok) => {
                    println!("Successfully refreshed session");
                    Self {
                        drive_client: Shared::new(Some(ok)),
                        loading_error: None,
                        can_ask_enable_sync: save.can_ask_enable_sync,
                    }
                },
                Err(e) => {
                    println!("Failed to refreshed session because: {}", e);
                    Self {
                        drive_client: Shared::new(None),
                        loading_error: Some(e),
                        can_ask_enable_sync: save.can_ask_enable_sync,
                    }
                }
            }
        }
        else 
        {
            println!("No refresh token saved");
            Self {
                drive_client: Shared::new(None),
                loading_error: None,
                can_ask_enable_sync: save.can_ask_enable_sync,
            }    
        }
    }

    pub fn read_remote_save(&self) -> Result<Option<RemoteSave>, String>
    {
        let binding = self.drive_client.get();
        let Some(client) = binding.as_ref() else {
            return Err("Cannot read from remote when no client is signed in".into());
        };

        let Some(json) = client.read_file()? else {
            return Ok(None);
        };

        let save = serde_json::from_str(&json)
            .map_err(|e| format!("Json error: {}", e))?;
        
        Ok(Some(save))
    }

    pub fn write_remote_save(&self, save: &RemoteSave) -> Result<(), String>
    {
        let binding = self.drive_client.get();
        let Some(client) = binding.as_ref() else {
            return Err("Cannot write to remote when no client is signed in".into());
        };

        println!("TODO: check owner id");

        // let user_info = client.get_user_info()?;

        // let Some(save_owner_id) = &save.note_record_save.owner_id else {
        //     return Err("Save must have a owner id to sync".into());
        // };

        // if *save_owner_id != user_info.sub
        // {
        //     return Err(format!("Save id {} is not the same as the user id {}", save.note_record_save.owner_id.as_ref().unwrap(), user_info.sub));
        // }

        let json = if cfg!(debug_assertions)
        {
            serde_json::to_string_pretty(save).unwrap()
        }
        else 
        {
            serde_json::to_string(save).unwrap()
        };
        
        client.write_file(&json)
    }

    pub fn get_owner_id(&self) -> Option<String>
    {
        self.drive_client.get().as_ref().map(|client| client.user_info().sub.clone())
    }

    fn spawn_signin_thread(&self, on_event: impl Fn(CloudEvent) + Send + Sync + 'static)
    {
        let sync_client = self.drive_client.clone();
        thread::spawn(move || {
            let client = ClientInfo { id: CLIENT_ID.into(), secret: CLIENT_SECRET.into() };
            let app_info = AppInfo { app_id: APP_ID.into(), sync_file_name: SYNC_FILE_NAME.into() };

            let client = match DriveSyncClient::signin_user(client, app_info, SUCCESS_PAGE_SRC.into(), CANCELLED_PAGE_SRC.into(), TIMEOUT_MS as u128, REDIRECT_URI.into()) {
                cloud_sync::SigninResult::Success(drive_sync_client) => {
                    drive_sync_client
                },
                cloud_sync::SigninResult::Denied => {
                    on_event(CloudEvent::SigninDenied);
                    return;
                },
                cloud_sync::SigninResult::Error(e) => {
                    on_event(CloudEvent::SigninError { 
                        message: e 
                    });
                    return;
                },
            };

            *sync_client.get() = Some(client);
            on_event(CloudEvent::SignedIn);
        });
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CloudSyncStateSave
{
    pub refresh_token: Option<String>,
    pub can_ask_enable_sync: bool,
}

impl Default for CloudSyncStateSave
{
    fn default() -> Self 
    {
        Self 
        { 
            refresh_token: Default::default(), 
            can_ask_enable_sync: true, 
        }
    }
}