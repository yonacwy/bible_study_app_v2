use std::{io::{Read, Write}, net::{TcpListener, TcpStream}, time::SystemTime};
use url::Url;
use urlencoding::encode;

use crate::{ClientInfo, PkcePair};

#[derive(Debug)]
pub struct AuthCode(pub String);

pub struct AuthCodeArgs<'a>
{
    pub client: &'a ClientInfo,
    pub pkce: &'a PkcePair,
    pub redirect_uri: &'a str,
    pub timeout_ms: u128,
    pub success_page_src: &'a str,
    pub cancel_page_src: &'a str,
}

#[derive(Debug)]
pub enum AuthResult {
    Success(AuthCode),
    Timeout,
    UserCancelled,
    Error(String),
}

pub fn request_auth_code(args: AuthCodeArgs) -> AuthResult
{
    let AuthCodeArgs { client, pkce, redirect_uri, timeout_ms, success_page_src, cancel_page_src } = args;

    let auth_url = get_auth_url(client, pkce, redirect_uri);

    if let Some(e) = webbrowser::open(&auth_url).err()
    {
        return AuthResult::Error(e.to_string())
    }

    let listener = match TcpListener::bind("127.0.0.1:8080") {
        Ok(ok) => ok,
        Err(e) => return AuthResult::Error(format!("TcpListener::bind error: {}", e.to_string()))
    };

    if let Err(e) = listener.set_nonblocking(true)
    {
        return AuthResult::Error(format!("TcpListener::set_nonblocking error: {}", e.to_string()));
    }

    let current = SystemTime::now();
    loop 
    {
        println!("ms = {}", current.elapsed().unwrap().as_millis());
        if current.elapsed().unwrap().as_millis() > timeout_ms
        {
            return AuthResult::Timeout;
        }

        match listener.accept() 
        {
            Ok((mut stream, _addr)) => 
            {
                match handle_connection(&mut stream, success_page_src, cancel_page_src) 
                {
                    ConnectionResult::AuthCode(code) => return AuthResult::Success(AuthCode(code)),
                    ConnectionResult::Cancelled => return AuthResult::UserCancelled,
                    ConnectionResult::Error(e) => return AuthResult::Error(e),
                    ConnectionResult::InvalidRequest => {
                        continue;
                    }
                }
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => 
            {
                // No connection yet, sleep briefly to avoid spinning
                std::thread::sleep(std::time::Duration::from_millis(100));
                continue;
            }
            Err(e) => return AuthResult::Error(format!("Unexpected error: {}", e)),
        }
    }
}

enum ConnectionResult {
    AuthCode(String),
    Cancelled,
    Error(String),
    InvalidRequest,
}

fn handle_connection(stream: &mut TcpStream, success_page_src: &str, cancel_page_src: &str) -> ConnectionResult {
    // Set a read timeout to detect stalled connections
    if let Err(e) = stream.set_read_timeout(Some(std::time::Duration::from_secs(5))) 
    {
        return ConnectionResult::Error(format!("Failed to set read timeout: {}", e));
    }
    
    let request = match read_request(stream) 
    {
        Ok(req) => req,
        Err(e) => 
        {
            if e.contains("Connection closed") {
                return ConnectionResult::Cancelled;
            }
            return ConnectionResult::Error(e);
        }
    };

    // Check if this is a valid HTTP request
    if request.is_empty() 
    {
        return ConnectionResult::Cancelled;
    }

    let first_line = match request.lines().next() 
    {
        Some(line) => line,
        None => return ConnectionResult::InvalidRequest,
    };

    // Check for favicon requests or other non-auth requests
    if first_line.contains("favicon.ico") || first_line.contains("robots.txt") 
    {
        send_404_response(stream);
        return ConnectionResult::InvalidRequest;
    }

    match get_code_from_request(first_line) 
    {
        Ok(code) => {
            let response = format_response(success_page_src);
            if let Err(e) = stream.write_all(response.as_bytes()) 
            {
                return ConnectionResult::Error(format!("Write error: {}", e));
            }
            let _ = stream.flush();
            ConnectionResult::AuthCode(code)
        }
        Err(_) => {
            // Check if this is an error callback (user denied access)
            if first_line.contains("error=access_denied") 
            {
                let error_response = format_response(cancel_page_src);
                let _ = stream.write_all(error_response.as_bytes());
                let _ = stream.flush();
                return ConnectionResult::Cancelled;
            }
            ConnectionResult::InvalidRequest
        }
    }
}

fn send_404_response(stream: &mut TcpStream) 
{
    let response = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n";
    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();
}

fn format_response(page_src: &str) -> String 
{
    format!("HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n{}", page_src)
}

fn read_request(stream: &mut TcpStream) -> Result<String, String> 
{
    let mut buffer = Vec::new();
    let mut temp_buf = [0u8; 512];
    loop 
    {
        match stream.read(&mut temp_buf) 
        {
            Ok(0) => {
                if buffer.is_empty() {
                    return Err("Connection closed before any data received".into())
                }

                break;
            }, // EOF
            Ok(n) => {
                buffer.extend_from_slice(&temp_buf[..n]);
                if buffer.windows(4).any(|w| w == b"\r\n\r\n") 
                {
                    break; // End of HTTP headers
                }
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => 
            {
                std::thread::sleep(std::time::Duration::from_millis(50));
                continue;
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => {
                return Err("Connection timed out - likely cancelled".into());
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::ConnectionReset => {
                return Err("Connection closed by browser".into());
            }
            Err(e) => return Err(format!("Read error: {}", e)),
        }
    }

    let request = String::from_utf8_lossy(&buffer).into_owned();
    Ok(request)
}

fn get_code_from_request(request_line: &str) -> Result<String, String>
{
    let parts: Vec<&str> = request_line.split_whitespace().collect();

    if parts.len() < 2 {
        return Err("Malformed HTTP request line".into());
    }

    let path_and_query = parts[1];
    let fake_url = format!("http://localhost{}", path_and_query);

    let parsed_url = Url::parse(&fake_url)
        .map_err(|e| format!("Failed to parse URL: {}", e))?;

    let code = parsed_url
        .query_pairs()
        .find(|(k, _)| k == "code")
        .map(|(_, v)| v.to_string());

    match code {
        Some(code) => Ok(code),
        None => Err("Authorization code not found in query string".into()),
    }
}

fn get_auth_url(client: &ClientInfo, pkce: &PkcePair, redirect_uri: &str) -> String 
{
    format!(
        "https://accounts.google.com/o/oauth2/v2/auth?response_type=code\
        &client_id={client_id}\
        &redirect_uri={redirect_uri}\
        &scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file%20openid%20profile%20email\
        &code_challenge={code_challenge}\
        &code_challenge_method=S256\
        &access_type=offline\
        &prompt=consent\
        &include_granted_scopes=false",
        client_id = encode(&client.id),
        redirect_uri = encode(redirect_uri),
        code_challenge = encode(&pkce.challenge),
    )
}