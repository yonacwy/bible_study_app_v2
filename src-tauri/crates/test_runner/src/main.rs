use std::time::SystemTime;

use cloud_sync::auth::{request_auth_code, AuthCodeArgs};
use cloud_sync::drive::DriveSyncApi;
use cloud_sync::exchange::{exchange_auth_code, CachedAccessToken, ExchangeAuthCodeArgs};
use cloud_sync::utils::{AppInfo, ClientInfo, PkcePair, DEFAULT_REDIRECT_URL};
use cloud_sync::{DriveSyncClient, SyncData, Syncable};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct TestData
{
    pub value: u32,
}

impl Syncable for TestData 
{
    fn merge(&mut self, self_time: SystemTime, other: &Self, other_time: SystemTime) 
    {
        if other_time > self_time
        {
            self.value = other.value
        }
    }
}

fn main() -> Result<(), String> 
{
    // Replace with your registered client ID
    let client_id = "752728507993-tandjiid9gvavab6g8pa0k1kpirghho6.apps.googleusercontent.com";
    let client_secret = "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";

    let redirect_uri = "http://localhost:8080";
    let page_src = include_str!("../res/auth.html");

    let client = ClientInfo {
        id: client_id.into(),
        secret: client_secret.into()
    };

    let app = AppInfo {
        app_id: "TEST_APP_NAME".into(),
        sync_file_name: "test_save.json".into(),
    };

    let timeout_ms = 10 * 60 * 1000;
    let drive_client = DriveSyncClient::<TestData>::signin_user(client, app, page_src, timeout_ms, redirect_uri).unwrap();

    let local = SyncData::new(TestData {
        value: 128,
    });

    let synced = drive_client.sync_data(local).unwrap();
    println!("value = {}", synced.data.value);
    
    Ok(())
}


