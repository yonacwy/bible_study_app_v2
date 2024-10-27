export function encode_64(data) {
    const json = JSON.stringify(data);
    return btoa(json);
}
export function decode_64(data) {
    const json = atob(data);
    return JSON.parse(json);
}
const DATA_PARAM_NAME = 'data';
export function encode_to_url(base, data) {
    const encoded = encode_64(data);
    return `${base}?${DATA_PARAM_NAME}=${encoded}`;
}
export function decode_from_url(url) {
    let search = new URLSearchParams(new URL(url).search);
    let data = search.get(DATA_PARAM_NAME);
    if (data === null) {
        return null;
    }
    else {
        return decode_64(data);
    }
}
