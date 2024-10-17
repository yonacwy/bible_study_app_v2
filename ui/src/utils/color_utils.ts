import { Color } from "../bindings";

export function clamp(min: number, max: number, value: number): number
{
    return Math.max(min, Math.min(max, value));
}

export function color_to_hex(color: Color): string
{
    const { r, g, b } = color;

    // Ensure r, g, and b are within the range of 0-255
    const clamp = (value: number) => Math.max(0, Math.min(255, value));

    // Convert each color component to a two-digit hexadecimal value
    const toHex = (value: number) => clamp(value).toString(16).padStart(2, '0');

    // Combine the hex values into a single string
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function inverse_color(color: Color): Color
{
    const { r, g, b } = color;
    let ir = 255 - r;
    let ig = 255 - g;
    let ib = 255 - b;
    return { r: ir, g: ig, b: ib };
}