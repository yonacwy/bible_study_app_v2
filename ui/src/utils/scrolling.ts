import { debug_print } from './index.js';
import { ValueStorage } from './storage.js';

type ScrollSave = {
    id: string | null,
    scroll: number,
}

const STORED_SCROLL: ValueStorage<ScrollSave> = new ValueStorage<ScrollSave>('scroll-path');

export function save_scroll(id: string | null)
{
    let scroll = window.scrollY;
    if(id !== null)
    {
        let element_scroll = document.getElementById(id)?.scrollTop;
        if(element_scroll !== undefined)
        {
            scroll = element_scroll;
        }
    }

    STORED_SCROLL.set({
        id,
        scroll
    });
}

export function load_scroll()
{
    let stored = STORED_SCROLL.get();
    STORED_SCROLL.set(null);
    if(stored)
    {
        if (stored.id === null)
        {
            window.scrollTo(0, stored.scroll);
            return;
        }
        
        let element = document.getElementById(stored.id);
        if(element)
        {
            element.scrollTop = stored.scroll;
        }
    }
}