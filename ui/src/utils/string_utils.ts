export function is_alpha_numeric(str: string): boolean
{
    const REGEX = /^[a-zA-Z0-9 ]+$/;
    return REGEX.test(str);
}

export function is_valid_title(str: string): boolean
{
    const REGEX = /^[a-zA-Z0-9 \'\"\?\!\:\;\,\.\+\-]+$/;
    return REGEX.test(str);
}

export function trim_string(str: string): string
{
    str = str.trim();
    return str.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '');
}

export function capitalize_first_char(str: string): string
{
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function is_empty_str(str: string): boolean
{
    return str.length === 0;
}