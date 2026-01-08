use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CleanError {
    #[error("Path not found: {0}")]
    PathNotFound(PathBuf),

    #[error("Permission denied: {0}")]
    PermissionDenied(PathBuf),

    #[error("File in use: {0}")]
    FileInUse(PathBuf),

    #[error("Config parse error: {0}")]
    ConfigParseError(String),

    #[error("Other error: {0}")]
    Other(String),
}

impl From<std::io::Error> for CleanError {
    fn from(err: std::io::Error) -> Self {
        match err.kind() {
            std::io::ErrorKind::NotFound => CleanError::PathNotFound(PathBuf::from("")),
            std::io::ErrorKind::PermissionDenied => CleanError::PermissionDenied(PathBuf::from("")),
            _ => CleanError::Other(err.to_string()),
        }
    }
}
