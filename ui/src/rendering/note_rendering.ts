import { NoteSourceType } from "../bindings.js";
import { SCHEMA } from "../text_editor/schema.js";
import { DOMSerializer } from "../vendor/prosemirror/prosemirror-model/index.js";
import * as utils from "../utils/index.js"

export type NoteText = {
    text: string, 
    source_type: NoteSourceType,
}

export function render_note_data(note: NoteText, on_search: (msg: string) => void, target: HTMLElement)
{
    if(note.source_type === 'markdown')
    {
        target.innerHTML = utils.render_markdown(note.text);
    }
    else if(note.source_type === 'html')
    {
        target.innerHTML = note.text;
    }
    else if(note.source_type === 'json')
    {
        if (note.text != '')
        {
            const doc = SCHEMA.nodeFromJSON(JSON.parse(note.text));
            const serializer = DOMSerializer.fromSchema(SCHEMA);
            let fragment = serializer.serializeFragment(doc.content) as HTMLElement;
            target.replaceChildren(fragment);
        }
        else
        {
            target.replaceChildren(document.createElement('div'));
        }
    }

    target.classList.add('note-target');
    target.querySelectorAll('div.bible-ref').forEach(ref => {
        ref.addEventListener('click', e => {
            let search_text = ref.innerHTML.substring(1, ref.innerHTML.length - 1);
            on_search(search_text);
        })
    })
}