use base64::Engine;
use rand::{distr::Alphanumeric, Rng};
use sha2::{Digest, Sha256};

pub const DEFAULT_REDIRECT_URL: &str = "http://localhost:8080";

#[derive(Debug, Clone)]
pub struct ClientInfo
{
    pub id: String,
    pub secret: String,
}

#[derive(Debug, Clone)]
pub struct AppInfo
{
    pub app_id: String,
    pub sync_file_name: String,
}

#[derive(Debug, Clone)]
pub struct PkcePair
{
    pub verifier: String,
    pub challenge: String,
}

impl PkcePair
{
    pub fn new() -> Self 
    {
        let verifier: String = rand::rng()
            .sample_iter(&Alphanumeric)
            .take(64)
            .map(char::from)
            .collect();

        let challenge = base64::engine::general_purpose::URL_SAFE_NO_PAD
            .encode(Sha256::digest(verifier.as_bytes()));

        Self {
            verifier,
            challenge,
        }
    }
}

pub trait ResultEx<T, E> : Sized
{
    fn strfy_err(self) -> Result<T, String>;

    fn fmt_strfy_err(self, prefix: &str) -> Result<T, String>
    {
        self.strfy_err().map_err(|e| format!("{}: {}", prefix, e))
    }
}

impl<T, E> ResultEx<T, E> for Result<T, E> where E : ToString
{
    fn strfy_err(self) -> Result<T, String> 
    {
        self.map_err(|e| e.to_string())
    }
}