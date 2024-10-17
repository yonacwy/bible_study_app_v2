export function encode_64(data: object): string
{
    const json = JSON.stringify(data);
    return btoa(json);
}

export function decode_64(data: string): object 
{
    const json = atob(data);
    return JSON.parse(json);
}

const DATA_PARAM_NAME: string = 'data';
export function encode_to_url(base: string, data: object): string
{
    const encoded = encode_64(data);
    return `${base}?${DATA_PARAM_NAME}=${encoded}`;
}

export function decode_from_url(url: string): object | null
{
    let search = new URLSearchParams(new URL(url).search);
    let data = search.get(DATA_PARAM_NAME);
    if(data === null)
    {
        return null;
    }
    else 
    {
        return decode_64(data);
    }
}