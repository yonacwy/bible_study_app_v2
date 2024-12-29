# Plan:
### Version 0.6.0: Multiple Bible Support
- [ ] Multiple Bible Support
- [ ] Special bible format?

### Version 0.5.0
- [ ] Notebook Support

### Version 0.4.5: Adding Reading Plans
- [ ] Adding built in reading plans

### Version 0.4.4: Hotfix
- [x] Fixed a bug with the volume slider

### Version 0.4.3: Visualization Overall
- [x] Implementing LESS
- [x] Settings
  - [x] Different Font Support
    - [x] Arial (Default)
    - [x] Times New Roman
    - [x] Brush Script
    - [x] Courier New
  - [x] Text Size
  - [x] UI Size
  - [x] Volume
- [x] Min Window Size
- [x] Sounds
  - [x] Page flipping
- [x] More tooltips
- [x] Tutorial Page (WIP)

### Version 0.4.2: Bugfixes
- [x] Bugfixes:
  - [ ] ~~Crash with note creation~~
  - [x] Context menu:
    - [x] Erase highlights with none created
    - [x] Set highlight with none created
    - [x] Context menu highlighting selection not updating highlight dropdown preview 
  - [x] Note visual not showing properly in first verse
  - [x] Fix the confirm delete note popup message
  - [x] Fix the confirm delete highlight popup message
- [x] Updates:
  - [x] Save files with versioning
  - [x] Visual for selecting notes
  - [x] Visual when save file not found
  - [x] Add `Jas` shorthand for James
  - [x] Update icon
- [x] Misc
  - [x] Fix spelling of `categories`
  - [x] ON BUILD: change file from short_kjv.txt to kjv.txt


### Version 0.4.1: Various Bugfixes
- [x] Note reference location view fix
- [x] Context menu interfering with spellchecker
- [x] Context menu positioning issue
- [x] Empty note looks weird
- [x] Delete note button in weird location
- [x] Toolbar for the editor not collapsing properly

### Version 0.4.0: Proper Note Taking
- [x] Verse notes
  - [x] Cross references
  - [x] Editor
  - [x] Links to other sections in scripture
- [ ] ~~Favorite verses~~
- [ ] ~~Section headings~~
- [x] Viewer overhaul
  - [x] Make viewer look nicer
  - [x] Allow for quick edits
  - [x] Viewer for word and verses

### Version 0.3.2: General Fixes
- [x] More text alternates for buttons
- [x] Bugs:
  - [x] Searching for spaces is allowed
  - [x] Punctuation in highlight names
  - [x] Reset scroll
  - [x] Duplicate words in searches break
- [x] Chapter History
- [x] Better section display for large word searches
  - [x] Make buttons look better
  - [x] Show chapter sections (ei: 1 Sam 4:4 -  Job 32:7), etc
  - [x] Need way to display short chapter names (first four letters?)
- [x] Can check for multiple of teh same words
  - [x] Will check frequency of those words
- [x] Top bar
  - [x] Make bigger
  - [x] Make buttons not shrink when make window smaller
- [x] Figure out name
- [x] Allow copy paste text

### Version 0.3.1: Hotfix 
- [x] Bug with large number of searched word verses
- [x] Word search large section selection

### Version 0.3.0: Searching
- [x] Improve Bible Viewer
  - [x] Better book/chapter selection
  - [x] Next/previous chapter buttons
  - [x] Search bar
- [x] Search-bar
  - [x] Word searches
    - [x] Returns result of all verses with words
    - [ ] ~~Has a priority system~~
    - [ ] ~~Closer to phrases better~~
  - [x] Section searches
    - [x] Parses searches similar to blue letter bible
    - [x] Goes to first verse when verse section selected
      - [ ] ~~Only display selected verses???~~

### Version 0.2.0: Highlight Support
- [x] Highlight Category:
  - [x] Data:
    - [x] Color
    - [x] Basic information on what its about
    - [x] Name
    - [x] Priority
  - [x] Can create new categories
  - [x] Can remove old categories
    - [x] Will have a warning message if any are in use
- [x] Highlighting Scripture
  - [x] Highlight Selection
    - [x] Select category
    - [x] Select area
  - [x] Removing Highlights
    - [x] Select category
    - [x] Hover over verses to remove
- [x] Save and load highlights
  - [x] Test clearing highlights
- [x] Hover display description
  - [x] Displays little popup with name when hovered over
  - [x] When clicked, creates sidebar with all names and description of highlights

### Version 0.1.0: Get Things Working
- [x] Display KJV bible
- [x] Chapter Selection
- [x] Looks decent