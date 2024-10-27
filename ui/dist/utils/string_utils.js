export function is_alpha_numeric(str) {
    const REGEX = /^[a-zA-Z0-9 ]+$/;
    return REGEX.test(str);
}
export function is_valid_title(str) {
    const REGEX = /^[a-zA-Z0-9 \'\"\?\!\:\;\,\.\+\-]+$/;
    return REGEX.test(str);
}
export function trim_string(str) {
    str = str.trim();
    return str.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '');
}
export function capitalize_first_char(str) {
    if (!str)
        return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}
