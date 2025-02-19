import { ChapterIndex, ReferenceLocation, VerseRange } from "../bindings"

export type PlayerSegment = {
    chapter_index: ChapterIndex,
    verse_range: VerseRange | null
};

export type PlayerBehavior = {
    name: string,
    image_src: string,
    get_next: (index: number) => PlayerSegment,
};

export class ReaderSchedular
{
    private current_behavior: PlayerBehavior;
    private index: number;
    private time: number;
}