use std::{num::ParseIntError, str::FromStr, string::ParseError};

pub struct ParseSaveVersionError;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SaveVersion
{
    SV0,
    SV1,
}

impl ToString for SaveVersion
{
    fn to_string(&self) -> String 
    {
        match self 
        {
            SaveVersion::SV0 => "0".into(),
            SaveVersion::SV1 => "1".into(),
        }
    }
}

impl FromStr for SaveVersion
{
    type Err = ParseSaveVersionError;

    fn from_str(s: &str) -> Result<Self, Self::Err> 
    {
        match s 
        {
            "0" => Ok(SaveVersion::SV0),
            "1" => Ok(SaveVersion::SV1),
            _ => Err(ParseSaveVersionError)
        }
    }
}

pub fn migrate_save(data: &str) -> String 
{
    "".into()
}