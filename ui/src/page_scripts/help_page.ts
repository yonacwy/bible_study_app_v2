import * as utils from "../utils/index.js";
import { init_settings_page_header } from "./menu_header.js";
import * as pages from "./pages.js";

export type HelpPageData = {
    old_path: string,
}

export function run()
{
    let data = utils.decode_from_url(window.location.href) as HelpPageData;
    init_settings_page_header(() => '');
    pages.init_back_button(data.old_path);
    pages.init_settings_buttons(data.old_path);
    document.body.style.visibility = 'visible'
}