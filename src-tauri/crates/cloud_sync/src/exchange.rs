use std::time::{Duration, SystemTime};

use serde::{Deserialize, Serialize};

use crate::{auth::AuthCode, utils::{ClientInfo, PkcePair}};

#[derive(Debug)]
pub struct CachedAccessToken
{
    client: ClientInfo,
    refresh_token: String,

    access_token: String,
    last_updated: SystemTime,
    expires_in: u64,
}

impl CachedAccessToken
{
    pub fn new(client: ClientInfo, response: TokenResponse, last_updated: SystemTime) -> Self
    {
        Self 
        {
            client,
            access_token: response.access_token,
            last_updated,
            refresh_token: response.refresh_token,
            expires_in: response.expires_in,
        }
    }

    pub fn from_refresh(client: ClientInfo, refresh_token: String) -> Result<Self, String> 
    {
        let refreshed = refresh_access_token(RefreshTokenArgs { 
            client: &client, 
            refresh_token: &refresh_token 
        })?;

        Ok(Self 
        {
            client,
            refresh_token,
            access_token: refreshed.access_token, 
            last_updated: SystemTime::now(),
            expires_in: refreshed.expires_in,
        })
    }

    pub fn refresh_token(&self) -> &str { &self.refresh_token }
    pub fn get_access_token(&mut self) -> Result<&str, String> 
    {
        if self.needs_refresh()
        {
            let refreshed = Self::from_refresh(self.client.clone(), self.refresh_token.clone())?;
            *self = refreshed;
        }

        Ok(&self.access_token)
    }

    fn needs_refresh(&self) -> bool 
    {
        match self.last_updated.elapsed() 
        {
            Ok(elapsed) => elapsed >= Duration::from_secs(self.expires_in - 300),
            Err(_) => true, // clock went backwards or something weird
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct TokenResponse 
{
    pub access_token: String,
    pub token_type: String,
    pub expires_in: u64,
    pub refresh_token: String,
    pub scope: String,
}

pub struct ExchangeAuthCodeArgs<'a>
{
    pub code: &'a AuthCode,
    pub client: &'a ClientInfo,
    pub redirect_uri: &'a str,
    pub pkce: &'a PkcePair
}

pub fn exchange_auth_code(args: ExchangeAuthCodeArgs) -> Result<TokenResponse, String>
{
    let ExchangeAuthCodeArgs { code, client, redirect_uri, pkce } = args;

    let params = [
        ("code", code.0.as_str()),
        ("client_id", client.id.as_str()),
        ("client_secret", client.secret.as_str()),
        ("redirect_uri", redirect_uri),
        ("grant_type", "authorization_code"),
        ("code_verifier", &pkce.verifier),
    ];

    let body = serde_urlencoded::to_string(&params).unwrap();
    let client = ureq::post("https://oauth2.googleapis.com/token")
        .set("Content-Type", "application/x-www-form-urlencoded");

    let response = client.send_string(&body);
    match response {
        Ok(resp) => {
            let json = resp.into_string().unwrap_or_else(|e| format!("Error reading response: {}", e));
            match serde_json::from_str(&json) {
                Ok(ok) => Ok(ok),
                Err(err) => Err(err.to_string())
            }
        },
        Err(ureq::Error::Status(_, response)) => {
            let status = response.status();
            let text = response.into_string().unwrap_or_else(|_| "No response body".to_string());
            Err(format!("Error {}: {}", status, text))
        },
        Err(ureq::Error::Transport(transport)) => {
            let text = transport.to_string();
            Err(format!("Error transport: {}", text))
        }
    }
}

pub struct RefreshTokenArgs<'a> {
    pub client: &'a ClientInfo,
    pub refresh_token: &'a str,
}

#[derive(Serialize, Deserialize)]
pub struct RefreshTokenResponse 
{
    pub access_token: String,
    pub token_type: String,
    pub expires_in: u64,
    pub scope: String,
}

pub fn refresh_access_token(args: RefreshTokenArgs) -> Result<RefreshTokenResponse, String> 
{
    let RefreshTokenArgs { client, refresh_token } = args;

    let params = [
        ("client_id", client.id.as_str()),
        ("client_secret", client.secret.as_str()),
        ("refresh_token", refresh_token),
        ("grant_type", "refresh_token"),
    ];

    let body = serde_urlencoded::to_string(&params).unwrap();

    let client = ureq::post("https://oauth2.googleapis.com/token")
        .set("Content-Type", "application/x-www-form-urlencoded");

    let response = client.send_string(&body);
    match response {
        Ok(resp) => {
            let json = resp.into_string().unwrap_or_else(|e| format!("Error reading response: {}", e));
            match serde_json::from_str(&json) {
                Ok(ok) => Ok(ok),
                Err(err) => Err(format!("Failed to parse token response JSON: {err}\nResponse was: {json}")),
            }
        },
        Err(ureq::Error::Status(_, response)) => {
            let status = response.status();
            let text = response.into_string().unwrap_or_else(|_| "No response body".to_string());
            Err(format!("Error {}: {}", status, text))
        },
        Err(ureq::Error::Transport(transport)) => {
            let text = transport.to_string();
            Err(format!("Transport error: {}", text))
        }
    }
}

pub fn revoke_token(token: &str) -> Result<(), String> 
{
    let params = [("token", token)];
    let body = serde_urlencoded::to_string(&params).unwrap();
    
    let client = ureq::post("https://oauth2.googleapis.com/revoke")
        .set("Content-Type", "application/x-www-form-urlencoded");

    let response = client.send_string(&body);
    match response 
    {
        Ok(_) => Ok(()),
        Err(ureq::Error::Status(status, response)) => 
        {
            let text = response.into_string().unwrap_or_else(|_| "No response body".to_string());
            Err(format!("Failed to revoke token. Status {}: {}", status, text))
        },
        Err(ureq::Error::Transport(transport)) => 
        {
            Err(format!("Transport error during token revocation: {}", transport))
        }
    }
}