use std::num::NonZeroU32;

pub struct Bible
{
    pub name: String,
    pub description: String,
    pub books: Vec<Book>
}

pub struct Book 
{
    pub name: String,
    pub chapters: Chapter,
}

pub struct Chapter 
{
    pub number: NonZeroU32,
    pub verses: Vec<Verse>,
}

pub struct Verse 
{
    pub number: NonZeroU32,
    pub text: String,
}