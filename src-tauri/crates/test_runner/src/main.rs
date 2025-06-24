use std::time::SystemTime;
use cloud_sync::utils::{AppInfo, ClientInfo};
use cloud_sync::{DriveSyncClient, SigninResult};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TestData
{
    pub value: u32,
    pub time: SystemTime,
}

fn main() -> Result<(), String> 
{
    // Replace with your registered client ID
    let client_id = "752728507993-tandjiid9gvavab6g8pa0k1kpirghho6.apps.googleusercontent.com";
    let client_secret = "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";

    let redirect_uri = "http://localhost:8080";
    let page_src = include_str!("../res/auth.html");
    let cancel_page_src = include_str!("../res/cancelled.html");

    let client = ClientInfo {
        id: client_id.into(),
        secret: client_secret.into()
    };

    let app = AppInfo {
        app_id: "TEST_APP_NAME".into(),
        sync_file_name: "test_save.json".into(),
    };

    let timeout_ms =  30 * 1000;
    let drive_client = match DriveSyncClient::signin_user(client.clone(), app.clone(), page_src, cancel_page_src, timeout_ms, redirect_uri) {
        SigninResult::Success(drive_sync_client) => drive_sync_client,
        SigninResult::Denied => {
            return Err(format!("Failed to sign in"));
        },
        SigninResult::Error(e) => return Err(e),
    };

    let drive_client = DriveSyncClient::from_refresh_token(client, app, drive_client.refresh_token().into()).unwrap();

    // let local = TestData {
    //     value: 24,
    //     time: SystemTime::now(),
    // };

    // drive_client.write_file(&serde_json::to_string(&local).unwrap()).unwrap();
    // let synced = drive_client.read_file().unwrap();
    // println!("value = {:#?}", synced);

    let info = drive_client.get_user_info();
    println!("value = {:#?}", info);
    
    Ok(())
}


