use std::{io::{Read, Write}, net::{TcpListener, TcpStream}, time::SystemTime};
use url::Url;
use urlencoding::encode;

use crate::{ClientInfo, PkcePair};

pub struct AuthCode(pub String);

pub struct AuthCodeArgs<'a>
{
    pub client: &'a ClientInfo,
    pub pkce: &'a PkcePair,
    pub redirect_uri: &'a str,
    pub timeout_ms: u128,
    pub page_src: &'a str,
}

pub fn request_auth_code(args: AuthCodeArgs) -> Result<AuthCode, String>
{
    let AuthCodeArgs { client, pkce, redirect_uri, timeout_ms, page_src } = args;

    let auth_url = get_auth_url(client, pkce, redirect_uri);

    if let Some(e) = webbrowser::open(&auth_url).err()
    {
        return Err(e.to_string())
    }

    let listener = TcpListener::bind("127.0.0.1:8080").unwrap();
    listener.set_nonblocking(true).unwrap();
    let current = SystemTime::now();
    let code = loop 
    {
        if current.elapsed().unwrap().as_millis() > timeout_ms
        {
            break None;
        }

        match listener.accept() 
        {
            Ok((mut stream, _addr)) => 
            {
                let request = read_request(&mut stream)?;

                if let Some(line) = request.lines().next() 
                {
                    let code = get_code_from_request(line)?;

                    let response = format_response(page_src);
                    stream.write_all(response.as_bytes()).unwrap();
                    stream.flush().unwrap();
                    break Some(code);
                }
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => 
            {
                // No connection yet, sleep briefly to avoid spinning
                std::thread::sleep(std::time::Duration::from_millis(100));
                continue;
            }
            Err(e) => return Err(format!("Unexpected error: {}", e)),
        }
    };

    match code {
        Some(code) => Ok(AuthCode(code)),
        None => Err("Timeout".into())
    }
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
            Ok(0) => break, // EOF
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
        &scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file\
        &code_challenge={code_challenge}\
        &code_challenge_method=S256\
        &access_type=offline",
        client_id = encode(&client.id),
        redirect_uri = encode(redirect_uri),
        code_challenge = encode(&pkce.challenge),
    )
}