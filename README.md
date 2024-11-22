# Ascribe
Ascribe is a free and open source bible study appliation with note taking, highlighting, and markdown support. It is currently in its early stages and has quite a lot of bugs, but is still designed to be a powerful bible searching tool.

## Design Goals

- **Simple**: Like many more modern Bible Applications, Ascribe is relitivly straight forword in its use, but offers a lot of powerful notetaking options
- **Powerful**: Currently, Ascribe offers a subset of GitHubMarkdown, along with HTML support tempararoly (though this may be removed in the future, once a more powerful form of markdown is added)
- **Offline**: No features of Ascribe require an internet connection and syncing between devices is the only planned feature in the future that would require it.
- **Small**: Currently, Ascribe is under 30mb, and will attempt to remain that way for the forseeable future (this actually suprised me, because as of version `0.4.1`, it contains all 33,000 verses of the KJV, uncompressed)
- **Forever Free and Open Source**: As Ascribe is a note taking tool for the Word of God, it feels weird to charge for it, and so it shall remain free and open source (though, this will limit Bible versions, as many of them are neither)

## Tech Stack

- Frontend: TypeScript, HTML, CSS
- Backend: Rust, using the [Tauri](https://tauri.app/) framework
- Save files: Json

## Getting Started

### Simple Install
If you just want to download the Ascribe installer, simply download the latest version from the [Ascribe Website](https://fisharmy100.github.io/bible_study_app_v2/), us it to install the program, and off you go!

**NOTE:** As of version 0.4.1, there is no updator and save files may contain breaking changes when upgrading to versions, so if you are updating the project, you need to uninstall it, and reinstall it, while deleting the `save.txt` file. However, this should change as a updater is planned for version `0.4.2`.

### Compiling from Source
In order to compile and run teh project from source, use the following steps
- Download and install the [rustc](https://www.rust-lang.org/) compiler
- Run the command `cargo install tauri-cli --version "^2.0.0" --locked`, which will install the Tauri CLI utilities library. See [this](https://v2.tauri.app/reference/cli/) example
- Download [Node.js](https://nodejs.org/en)
- Run the command `npm install -g typescript`, which will install typescript globally on your machine. See [this](https://www.typescriptlang.org/download/) example
- Clone the project onto your machine
- Finally:
  - To run in debug mode: call `cargo tauri dev` in the Ascribe root folder
  - To build in release mode:
    - call `cargo tauri build` in the Ascribe root folder
    - Go to `src-tauri/target/release/bundle`, and there you will see a list of instalation folders, where you can click on one, and install using either `.msi` or the `.exe` installers.
