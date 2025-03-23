// use crate::{ast::Node, reader::CharReader};

// pub fn parse(text: &str) -> Node
// {
//     let Some(mut reader) = CharReader::new(text) else {
//         return Node::Root { children: vec![] };
//     };

//     let mut children = vec![];
//     while !reader.at_end()
//     {
//         children.push(parse_node(&mut reader));
//     }

//     Node::Root { children }
// }

// pub fn parse_node(reader: &mut CharReader) -> Node
// {
//     let current = reader.current();
//     match current
//     {
//         '#' => parse_heading(reader),
//         _ => parse_text(reader)
//     }
// }

// pub fn parse_heading(reader: &mut CharReader) -> Node
// {
//     let mut level = 0;
//     while let Some(_) = reader.check(&['#']) 
//     {
//         level += 1;
//     }

//     let mut children = vec![];
//     while reader.current() != '\n'
//     {
//         children.push(parse_node(reader));
//     }

//     Node::Heading { level, children }
// }

// pub fn parse_decoration(reader: &mut CharReader) -> Node
// {

// }

// pub fn parse_text(reader: &mut CharReader) -> Node
// {

// }