use serde::{Deserialize, Serialize};

use crate::{auth::AuthCode, ClientInfo, PkcePair};

#[derive(Serialize, Deserialize)]
pub struct TokenResponse 
{
    pub access_token: String,
    pub token_type: String,
    pub expires_in: u128,
    pub refresh_token: String,
    pub scope: String,
}

pub struct AccessToken(pub String);

impl TokenResponse
{
    pub fn get_access_token(&self) -> AccessToken
    {
        AccessToken(self.access_token.clone())
    }
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