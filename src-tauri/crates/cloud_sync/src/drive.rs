use std::fs;
use std::path::Path;
use serde::ser::Error;
use serde_json::{json, Value};

#[derive(Debug)]
pub enum DriveError {
    FileNotFound(String),
    IoError(std::io::Error),
    HttpError(ureq::Error),
    JsonError(serde_json::Error),
}

impl From<std::io::Error> for DriveError {
    fn from(err: std::io::Error) -> Self {
        DriveError::IoError(err)
    }
}

impl From<ureq::Error> for DriveError {
    fn from(err: ureq::Error) -> Self {
        DriveError::HttpError(err)
    }
}

impl From<serde_json::Error> for DriveError {
    fn from(err: serde_json::Error) -> Self {
        DriveError::JsonError(err)
    }
}

impl std::fmt::Display for DriveError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DriveError::FileNotFound(path) => write!(f, "File not found: {}", path),
            DriveError::IoError(err) => write!(f, "IO error: {}", err),
            DriveError::HttpError(err) => write!(f, "HTTP error: {}", err),
            DriveError::JsonError(err) => write!(f, "JSON error: {}", err),
        }
    }
}

impl std::error::Error for DriveError {}

pub struct DriveClient {
    access_token: String,
}

impl DriveClient {
    pub fn new(access_token: String) -> Self {
        Self { access_token }
    }

    /// Upload a file from local filesystem to Google Drive
    pub fn upload_file_from_path<P: AsRef<Path>>(
        &self,
        local_path: P,
        drive_filename: Option<&str>,
        parent_folder_id: Option<&str>,
    ) -> Result<Value, DriveError> {
        let path = local_path.as_ref();
        
        if !path.exists() {
            return Err(DriveError::FileNotFound(path.display().to_string()));
        }

        let content = fs::read_to_string(path)?;
        let filename = drive_filename.unwrap_or_else(|| {
            path.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unnamed.txt")
        });

        self.upload_file_content(&content, filename, parent_folder_id)
    }

    /// Upload file content directly to Google Drive
    pub fn upload_file_content(
        &self,
        content: &str,
        filename: &str,
        parent_folder_id: Option<&str>,
    ) -> Result<Value, DriveError> {
        let mut metadata = json!({
            "name": filename,
            "mimeType": "text/plain"
        });

        // Add parent folder if specified
        if let Some(folder_id) = parent_folder_id {
            metadata["parents"] = json!([folder_id]);
        }

        let boundary = "BOUNDARY123456789";
        let multipart_body = format!(
            "--{boundary}\r\n\
            Content-Type: application/json; charset=UTF-8\r\n\r\n\
            {metadata}\r\n\
            --{boundary}\r\n\
            Content-Type: text/plain\r\n\r\n\
            {content}\r\n\
            --{boundary}--",
            boundary = boundary,
            metadata = metadata.to_string(),
            content = content
        );

        let response = ureq::post("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart")
            .set("Authorization", &format!("Bearer {}", self.access_token))
            .set("Content-Type", &format!("multipart/related; boundary={}", boundary))
            .send_string(&multipart_body)?;

        let response_text = response.into_string()?;
        let json_response: Value = serde_json::from_str(&response_text)?;
        
        Ok(json_response)
    }

    /// Download a file from Google Drive and save it locally
    pub fn download_file_to_path<P: AsRef<Path>>(
        &self,
        file_id: &str,
        local_path: P,
    ) -> Result<(), DriveError> {
        let content = self.download_file_content(file_id)?;
        fs::write(local_path, content)?;
        Ok(())
    }

    /// Download file content from Google Drive
    pub fn download_file_content(&self, file_id: &str) -> Result<String, DriveError> {
        let url = format!("https://www.googleapis.com/drive/v3/files/{}?alt=media", file_id);
        
        let response = ureq::get(&url)
            .set("Authorization", &format!("Bearer {}", self.access_token))
            .call()?;

        Ok(response.into_string()?)
    }

    /// Update an existing file on Google Drive
    pub fn update_file_content(
        &self,
        file_id: &str,
        new_content: &str,
    ) -> Result<Value, DriveError> {
        let url = format!("https://www.googleapis.com/upload/drive/v3/files/{}?uploadType=media", file_id);
        
        let response = ureq::patch(&url)
            .set("Authorization", &format!("Bearer {}", self.access_token))
            .set("Content-Type", "text/plain")
            .send_string(new_content)?;

        let response_text = response.into_string()?;
        let json_response: Value = serde_json::from_str(&response_text)?;
        
        Ok(json_response)
    }

    /// List files in Google Drive (with optional query)
    pub fn list_files(&self, query: Option<&str>) -> Result<Value, DriveError> {
        let mut url = "https://www.googleapis.com/drive/v3/files".to_string();
        
        if let Some(q) = query {
            url.push_str(&format!("?q={}", urlencoding::encode(q)));
        }

        let response = ureq::get(&url)
            .set("Authorization", &format!("Bearer {}", self.access_token))
            .call()?;

        let response_text = response.into_string()?;
        let json_response: Value = serde_json::from_str(&response_text)?;
        
        Ok(json_response)
    }

    /// Get file metadata
    pub fn get_file_metadata(&self, file_id: &str) -> Result<Value, DriveError> {
        let url = format!("https://www.googleapis.com/drive/v3/files/{}", file_id);
        
        let response = ureq::get(&url)
            .set("Authorization", &format!("Bearer {}", self.access_token))
            .call()?;

        let response_text = response.into_string()?;
        let json_response: Value = serde_json::from_str(&response_text)?;
        
        Ok(json_response)
    }

    /// Delete a file from Google Drive
    pub fn delete_file(&self, file_id: &str) -> Result<(), DriveError> {
        let url = format!("https://www.googleapis.com/drive/v3/files/{}", file_id);
        
        ureq::delete(&url)
            .set("Authorization", &format!("Bearer {}", self.access_token))
            .call()?;

        Ok(())
    }

    /// Create a new file or update existing file with the same name
    /// Returns (file_id, was_created) where was_created is true if file was newly created
    pub fn create_or_update_file(
        &self,
        filename: &str,
        content: &str,
        parent_folder_id: Option<&str>,
    ) -> Result<(String, bool), DriveError> {
        // First, search for existing file with the same name
        let mut query = format!("name='{}'", filename);
        
        // Add parent folder to search if specified
        if let Some(folder_id) = parent_folder_id {
            query.push_str(&format!(" and '{}' in parents", folder_id));
        }
        
        let search_result = self.list_files(Some(&query))?;
        
        // Check if any files were found
        if let Some(files) = search_result["files"].as_array() {
            if let Some(existing_file) = files.first() {
                // File exists, update it
                let file_id = existing_file["id"].as_str()
                    .ok_or_else(|| DriveError::JsonError(serde_json::Error::custom("Missing file ID")))?;
                
                self.update_file_content(file_id, content)?;
                return Ok((file_id.to_string(), false)); // false = not created, updated
            }
        }
        
        // File doesn't exist, create it
        let create_result = self.upload_file_content(content, filename, parent_folder_id)?;
        let file_id = create_result["id"].as_str()
            .ok_or_else(|| DriveError::JsonError(serde_json::Error::custom("Missing file ID in create response")))?;
        
        Ok((file_id.to_string(), true)) // true = newly created
    }

    /// Find a file by name (returns the first match if multiple files have the same name)
    pub fn find_file_by_name(
        &self,
        filename: &str,
        parent_folder_id: Option<&str>,
    ) -> Result<Option<Value>, DriveError> {
        let mut query = format!("name='{}'", filename);
        
        if let Some(folder_id) = parent_folder_id {
            query.push_str(&format!(" and '{}' in parents", folder_id));
        }
        
        let search_result = self.list_files(Some(&query))?;
        
        if let Some(files) = search_result["files"].as_array() {
            if let Some(file) = files.first() {
                return Ok(Some(file.clone()));
            }
        }
        
        Ok(None)
    }
}