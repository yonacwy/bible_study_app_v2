import { MenuElement, MenuItem } from "../vendor/prosemirror/prosemirror-menu/index.js";
import { buildMenuItems } from "../vendor/prosemirror/prosemirror-setup/menu.js";
import { SCHEMA } from "./schema.js";

export function build_menu(): MenuElement[][]
{
    return buildMenuItems(SCHEMA).fullMenu;
}