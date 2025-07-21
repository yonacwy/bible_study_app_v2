

#[macro_export]
macro_rules! debug_release_val 
{
    (debug: $debug_val:expr, release: $release_val:expr $(,)?) => {
        if cfg!(debug_assertions)
        {
            $debug_val
        }
        else 
        {
            $release_val 
        }
    };
}