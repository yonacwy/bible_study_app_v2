use std::{marker::PhantomData, time::SystemTime};

use serde::{Deserialize, Serialize};

use crate::{auth::{request_auth_code, AuthCodeArgs}, drive::DriveSyncApi, exchange::{exchange_auth_code, CachedAccessToken, ExchangeAuthCodeArgs}, utils::{AppInfo, ClientInfo, PkcePair}};

pub mod auth;
pub mod exchange;
pub mod drive;
pub mod utils;

pub trait Syncable : Serialize + for<'a> Deserialize<'a>
{
    fn merge(&mut self, self_time: SystemTime, other: &Self, other_time: SystemTime);
}

pub struct DriveSyncClient<T> where T : Syncable
{
    api: DriveSyncApi,
    refresh_token: String,
    _phantom: PhantomData<T>
}

impl<T> DriveSyncClient<T> where T : Syncable
{
    pub fn refresh_token(&self) -> &str { &self.refresh_token }

    // Clean sign in. It will redirect the user to sign in to google drive using their credentials
    pub fn signin_user(client: ClientInfo, app_info: AppInfo, page_src: &str, timeout_ms: u128, redirect_uri: &str) -> Result<Self, String>
    {
        let pkce = PkcePair::new();
        
        let auth_code = request_auth_code(AuthCodeArgs {
            client: &client,
            pkce: &pkce,
            redirect_uri,
            timeout_ms,
            page_src,
        })?;

        let response = exchange_auth_code(ExchangeAuthCodeArgs {
            code: &auth_code,
            client: &client,
            redirect_uri,
            pkce: &pkce
        })?;

        let refresh_token = response.refresh_token.clone();
        let access_token = CachedAccessToken::new(client, response, SystemTime::now());
        let api = DriveSyncApi::new(access_token, app_info.app_id.clone(), app_info.sync_file_name.clone());

        Ok(Self 
        {
            api,
            refresh_token,
            _phantom: PhantomData,
        })
    }

    // If a refresh token was saved, 
    pub fn from_refresh_token(client: ClientInfo, app_info: AppInfo, refresh_token: String) -> Result<Self, String>
    {
        let access_token = CachedAccessToken::from_refresh(client, refresh_token.clone())?;
        let api = DriveSyncApi::new(access_token, app_info.app_id.clone(), app_info.sync_file_name.clone());

        Ok(Self 
        {
            api,
            refresh_token,
            _phantom: PhantomData,
        })
    }

    pub fn sync_data(&self, local: SyncData<T>) -> Result<SyncData<T>, String>
    {
        let remote = match self.api.read() {
            Ok(ok) => ok,
            Err(e) => return Err(e.to_string())
        };

        let synced = match remote
        {
            Some(remote) => {
                let mut remote: SyncData<T> = serde_json::from_str(&remote)
                    .map_err(|e| e.to_string())?;

                remote.merge(&local);
                remote
            },
            None => local,
        };

        let synced_json = serde_json::to_string(&synced).map_err(|e| e.to_string())?;
        self.api.write(&synced_json).map_err(|e| e.to_string())?;

        Ok(synced)
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(bound = "T: Syncable")]
pub struct SyncData<T>
where
    T: Syncable + Serialize
{
    pub update_time: SystemTime,
    pub data: T,
}

impl<T> SyncData<T> where T : Syncable
{
    pub fn new(data: T) -> Self
        where T : Serialize
    {
        Self 
        {
            update_time: SystemTime::now(),
            data,
        }
    }

    pub fn merge<'a>(&mut self, other: &Self)
    {
        // if this is of the same update, we don't have to do anything
        if self.update_time == other.update_time
        {
            return;
        }

        self.data.merge(self.update_time, &other.data, other.update_time);
        self.update_time = SystemTime::now();
    }
}