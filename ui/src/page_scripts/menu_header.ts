export function get_header(): HTMLElement
{
    return document.getElementsByTagName('header')[0];
}

export function init_main_page_header(extra?: (e: HTMLElement) => void)
{
    let header = get_header();
    header.innerHTML = `
        ${BIBLE_VERSION_DROPDOWN}
        <div class="dropdown">
            <button class="image-btn" title="Bible chapter selection">
                <img src="../images/light-books.svg">
            </button>
            <div class="dropdown-content" id="book-selection-content"></div>
        </div>
        <div class="searchbar" style="position: relative;">
            <input type="text" id="search-input">
            <button id="search-btn" class="image-btn" title="Search the bible">
                <img src="../images/light-magnifying-glass.svg">
            </button> 
            <div class="error-popup" id="error-message"></div>
        </div>
        <button class="image-btn" id="back-btn" title="Go back">
            <img src="../images/light-arrow-turn-left.svg">
        </button>
        <button class="image-btn" id="forward-btn" title="Go forward">
            <img src="../images/light-arrow-turn-right.svg">
        </button>
        <button class="image-btn" id="new-note-btn" title="New Note">
            <img src="../images/light-note-medical.svg" alt="Button">
        </button>
        <div class="dropdown">
            <button class="image-btn" id="highlight-selector-btn" title="Select a highlight to paint with">
                <img src="../images/light-highlighter-line.svg" alt="Dropdown Button">
            </button>
            <div class="dropdown-content" id="highlights-dropdown"></div>
        </div>
        <button class="image-btn" id="erase-highlight-toggle" title="Toggle if you want to erase highlights">
            <img src="../images/light-eraser.svg">
        </button>
        ${SETTINGS_DROPDOWN}
    `;

    if(extra !== undefined)
    {
        extra(header);
    }
}

export function init_settings_page_header(middle: () => string)
{
    get_header().innerHTML = `
        <button class="image-btn" id="back-btn" title="Back">
            <img src="../images/light-backward.svg">
        </button>
        ${middle()}
        ${SETTINGS_DROPDOWN}
    `;
}

export const BIBLE_VERSION_DROPDOWN: string = `
<div class="text-dropdown" id="bible-version-dropdown">
    <div class="dropdown-title">KJV</div>
    <div class="dropdown-content"></div>
</div>
`

export const SETTINGS_DROPDOWN: string = `
<div class="dropdown shift-right">
    <button class="image-btn" title="Options">
        <img src="../images/light-list-ul.svg">
    </button>
    <div class="small-dropdown-content">
        <button class="image-btn" id="highlight-settings" title="Highlight Options">
            <img src="../images/light-paintbrush-pencil.svg" alt="">
        </button>
        <button class="image-btn" id="main-settings" title="Settings">
            <img src="../images/light-gear-complex.svg" alt="">
        </button>
        <button class="image-btn" id="readings-btn" title="Daily Readings">
            <img src="../images/light-calendar-lines.svg" alt=""> 
        </button>
        <button class="image-btn" id="help-btn" title="Help">
            <img src="../images/light-info.svg" alt=""> 
        </button>
    </div>
</div>
`;