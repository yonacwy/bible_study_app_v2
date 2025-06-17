use std::{marker::PhantomData, time::SystemTime};

use crate::{auth::{request_auth_code, AuthCodeArgs, AuthResult}, drive::DriveSyncApi, exchange::{exchange_auth_code, CachedAccessToken, ExchangeAuthCodeArgs}, utils::{AppInfo, ClientInfo, PkcePair, ResultEx}};

pub mod auth;
pub mod exchange;
pub mod drive;
pub mod utils;

pub trait Syncable : Sized
{
    fn serialize(&self) -> Result<String, String>;
    fn deserialize(str: &str) -> Result<Self, String>;
    fn merge(remote: &Self, local: &Self) -> Self;
}

pub struct DriveSyncClient<T> where T : Syncable
{
    api: DriveSyncApi,
    refresh_token: String,
    _phantom: PhantomData<T>
}

pub enum SigninResult<T> where T : Syncable
{
    Success(DriveSyncClient<T>),
    Denied,
    Error(String),
}

impl<T> DriveSyncClient<T> where T : Syncable
{
    pub fn refresh_token(&self) -> &str { &self.refresh_token }

    // Clean sign in. It will redirect the user to sign in to google drive using their credentials
    pub fn signin_user(client: ClientInfo, app_info: AppInfo, page_src: &str, timeout_ms: u128, redirect_uri: &str) -> SigninResult<T>
    {
        let pkce = PkcePair::new();
        
        let auth_code = match request_auth_code(AuthCodeArgs {
            client: &client,
            pkce: &pkce,
            redirect_uri,
            timeout_ms,
            page_src,
        }) {
            AuthResult::Success(auth_code) => auth_code,
            AuthResult::Timeout | AuthResult::UserCancelled => return SigninResult::Denied,
            AuthResult::Error(e) => return SigninResult::Error(e),
        };

        let response = match exchange_auth_code(ExchangeAuthCodeArgs {
            code: &auth_code,
            client: &client,
            redirect_uri,
            pkce: &pkce
        }) {
            Ok(ok) => ok,
            Err(err) => return SigninResult::Error(err),
        };

        let refresh_token = response.refresh_token.clone();
        let access_token = CachedAccessToken::new(client, response, SystemTime::now());
        let api = DriveSyncApi::new(access_token, app_info.app_id.clone(), app_info.sync_file_name.clone());

        SigninResult::Success(Self 
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

    pub fn sync_data(&self, local: T) -> Result<T, String>
    {
        let remote = match self.api.read() {
            Ok(ok) => ok,
            Err(e) => return Err(e.to_string())
        };

        let synced = match remote
        {
            Some(remote) => {
                let mut remote = T::deserialize(&remote)?;
                remote = T::merge(&remote, &local);
                remote
            },
            None => local,
        };

        let synced_json = synced.serialize()?;
        self.api.write(&synced_json).strfy_err()?;

        Ok(synced)
    }
}