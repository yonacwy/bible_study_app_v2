use cloud_sync::auth::{request_auth_code, AuthCodeArgs};
use cloud_sync::exchange::{exchange_auth_code, ExchangeAuthCodeArgs};
use cloud_sync::{ClientInfo, PkcePair};

fn main() -> Result<(), String> {
    // Replace with your registered client ID
    let client_id = "752728507993-tandjiid9gvavab6g8pa0k1kpirghho6.apps.googleusercontent.com";
    let client_secret = "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";
    let redirect_uri = "http://localhost:8080";

    let client = ClientInfo {
        id: client_id.into(),
        secret: client_secret.into()
    };

    let pkce = PkcePair::new();

    let auth_code = request_auth_code(AuthCodeArgs {
        client: &client,
        pkce: &pkce,
        redirect_uri,
        timeout_ms: 10 * 60 * 1000, // 10 mins
        page_src: include_str!("../res/auth.html"),
    })?;

    let token_response = exchange_auth_code(ExchangeAuthCodeArgs {
        code: &auth_code,
        client: &client,
        redirect_uri,
        pkce: &pkce,
    })?;

    upload_hello_world_file(&token_response.access_token);
    
    Ok(())
}

fn upload_hello_world_file(access_token: &str) {
    let metadata = serde_json::json!({
        "name": "helloworld.txt",
        "mimeType": "text/plain"
    });

    let file_content = "Hello, world!!!!!\n";

    let boundary = "BOUNDARY123456789";
    let multipart_body = format!(
        "--{boundary}\r\n\
        Content-Type: application/json; charset=UTF-8\r\n\r\n\
        {metadata}\r\n\
        --{boundary}\r\n\
        Content-Type: text/plain\r\n\r\n\
        {file_content}\r\n\
        --{boundary}--",
        boundary = boundary,
        metadata = metadata.to_string(),
        file_content = file_content
    );

    let response = ureq::post("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart")
        .set("Authorization", &format!("Bearer {}", access_token))
        .set("Content-Type", &format!("multipart/related; boundary={}", boundary))
        .send_string(&multipart_body);

    match response {
        Ok(resp) => println!("Upload successful: {}", resp.into_string().unwrap_or_default()),
        Err(e) => eprintln!("Upload error: {:?}", e),
    }
}


