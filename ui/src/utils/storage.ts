
export class ValueStorage<T>
{
    private readonly path: string;
    private on_changed_listeners: ((v: T) => void)[]
    public constructor(init: T, path: string)
    {
        this.path = path;
        store_value(path, init);
        this.on_changed_listeners = [];
    }

    public get(): T 
    {
        return retrieve_value(this.path) as T; // should never be null, as it is initialized in the constructor
    }

    public set(value: T)
    {
        store_value(this.path, value);
        this.update_listeners();
    }

    public add_listener(listener: (v: T) => void): boolean
    {
        if(!this.on_changed_listeners.includes(listener))
        {
            this.on_changed_listeners.push(listener);
            return true;
        }

        return false;
    }

    public remove_listener(listener: (v: T) => void): boolean
    {
        if(this.on_changed_listeners.includes(listener))
        {
            this.on_changed_listeners = this.on_changed_listeners.filter(l => l !== listener);
            return true;
        }

        return false;
    }

    public update_listeners()
    {
        let v = this.get();
        this.on_changed_listeners.forEach(l => {
            l(v);
        })
    }
}

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