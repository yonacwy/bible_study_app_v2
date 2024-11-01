
export function store_value<T>(path: string, value: T): void
{
    sessionStorage.setItem(path, JSON.stringify(value));
}

export function retrieve_value<T>(path: string): T | null 
{
    let data = sessionStorage.getItem(path);
    if(data === null) return data;
    let parsed = JSON.parse(data);

    return parsed as T;
}