import { VerseRange } from "./bindings.js";

export type Reading = {
    book: string,
    chapter: number,
    range?: VerseRange, 
};

export function get_readings(year: number, month: number, day: number): Reading[]
{
    return [
        {
            book: "Genesis",
            chapter: 1
        }
    ];
}