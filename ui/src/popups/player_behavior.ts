import { ChapterIndex, ReferenceLocation, VerseRange } from "../bindings"

export type PlayerBehavior = {
    name: string,
    image_src: string,
    get_next: (count: number, time: number) => ChapterIndex | VerseRange | null,
};

export class ReaderSchedular
{
    private current_behavior: PlayerBehavior
    private current_count: number
}