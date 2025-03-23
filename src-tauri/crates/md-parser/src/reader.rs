
pub struct CharReader
{
    chars: Vec<char>,
    index: usize,
}

impl CharReader
{
    pub fn new(text: &str) -> Option<Self>
    {
        if text.len() == 0 { return None; }

        Some(Self 
        {
            chars: text.chars().collect(),
            index: 0,
        })
    }

    pub fn peek(&self, count: usize) -> Option<char>
    {
        if self.index + count < self.chars.len()
        {
            Some(self.chars[self.index + count])
        }
        else 
        {
            None    
        }
    }

    pub fn current(&self) -> char 
    {
        self.chars[self.index]
    }

    pub fn advance(&mut self) -> Option<char> 
    {
        if !self.at_end()
        {
            let c = self.current();
            self.index += 1;
            Some(c)
        }
        else 
        {
            None    
        }
    }

    pub fn at_end(&self) -> bool 
    {
        self.index + 1 >= self.chars.len()
    }

    pub fn check(&mut self, cs: &[char]) -> Option<char> 
    {
        if cs.contains(&self.current())
        {
            self.advance()
        }
        else 
        {
            None    
        }
    }
}