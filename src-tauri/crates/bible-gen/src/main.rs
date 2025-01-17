pub mod bible;
pub mod printing;
use std::{env, fs, path::Path};

fn main() -> Result<(), String>
{
    let args: Vec<_> = env::args().into_iter()
        .map(|a| a.to_string())
        .collect();
    
    if args.len() < 4 { return Err("Expected an input file path, `-o` flag, and an output folder path".into()) }

    let Some(idx) = args.iter().position(|a| a == "-o") else {
        return Err("Expected an output path".into());
    };

    if args.len() != idx + 2 { return Err("Expected an output folder path after -o".into()) }

    let output_path = Path::new(args.last().unwrap());
    if !output_path.is_dir()
    {
        return Err("Output path must be a directory".into());
    }

    let input_paths = args.iter().skip(1).take(idx - 1).into_iter().map(|a| {
        let path = Path::new(a);
        if path.exists() && path.is_file()
        {
            Ok(path)
        }
        else 
        {
            Err(format!("File `{}` does not exist or is not a file", a))    
        }
    }).collect::<Result<Vec<_>, _>>()?;
    
    for path in input_paths
    {
        match bible::parse_json_file(path.to_str().unwrap()) 
        {
            Ok(ok) => 
            {
                let text = printing::convert_bible(&ok);
                let small_text = printing::convert_bible(&bible::make_small(&ok));

                let full_output_path = output_path.to_str().unwrap().to_owned() + &format!("\\{}.txt", ok.name.to_lowercase());
                let small_output_path = output_path.to_str().unwrap().to_owned() + &format!("\\small_{}.txt", ok.name.to_lowercase());

                println!("output path: {:?}", full_output_path);
                fs::write(full_output_path, text).expect("Failure to write to file");
                fs::write(small_output_path, small_text).expect("Failure to write to file");
            },
            Err(err) => println!("Failed to parse bible `{}`:\n - Error: `{}`", path.to_str().unwrap(), err)
        };
    }

    Ok(())
}
