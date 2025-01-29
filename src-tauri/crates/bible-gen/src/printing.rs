use regex::Regex;

use crate::bible::Bible;

lazy_static::lazy_static! 
{
    static ref REPLACE_REGEX: Regex = Regex::new(r"<FI>(.*?)<Fi>").unwrap();
}

pub fn convert_bible(bible: &Bible) -> String
{
    let mut c: String = "".into();
    c.push_str(&bible.name);
    c.push('\n');
    c.push_str(&bible.description);
    c.push('\n');
    
    bible.books.iter().map(|b| {
        let name = change_name(&b.name);

        b.chapters.iter().map(|c| {
            let chapter = c.number;

            c.verses.iter().map(|v| {
                let verse = v.number;
                let text = reformat_text(&v.text);

                format!("{} {}:{} {}\n", name.clone(), chapter.clone(), verse, text)
            }).collect::<Vec<_>>()
        }).collect::<Vec<_>>()
    })
    .flatten()
    .flatten()
    .for_each(|line| {
        c.push_str(&line);
    });

    return c
}

fn reformat_text(src: &str) -> String
{
    let ret = REPLACE_REGEX.replace_all(src, "[$1]").into_owned();
    ret
}

fn change_name(name: &str) -> String
{
    if name == "Revelation of John"
    {
        return "Revelation".into()
    }

    if name.starts_with("I") && !name.starts_with("Is")
    {
        let (number, base) = name.split_once(" ").unwrap();
        let prefix = number.len();

        return format!("{} {}", prefix, base);
    }

    name.into()
}