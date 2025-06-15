pub mod auth;
pub mod exchange;
pub mod drive;

use base64::Engine;
use rand::{distr::Alphanumeric, Rng};
use sha2::{Digest, Sha256};

pub const REDIRECT_URL: &str = "http://localhost:8080";

#[derive(Debug, Clone)]
pub struct ClientInfo
{
    pub id: String,
    pub secret: String,
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