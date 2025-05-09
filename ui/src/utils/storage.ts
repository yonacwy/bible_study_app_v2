
export class ValueStorage<T>
{
    private readonly path: string;
    private on_changed_listeners: ((v: T | null) => void)[]
    public constructor(path: string, default_val?: T)
    {
        this.path = path;
        this.on_changed_listeners = [];

        if (default_val !== undefined && this.get() !== null)
        {
            this.set(default_val);
        }
    }

    public get(): T | null
    {
        return retrieve_value(this.path) as T | null; // should never be null, as it is initialized in the constructor
    }

    public set(value: T | null)
    {
        store_value(this.path, value);
        this.update_listeners();
    }

    public update(update_fn: (v: T | null) => T | null)
    {
        let v = this.get();
        v = update_fn(v);
        this.set(v);
    }

    public add_listener(listener: (v: T | null) => void): boolean
    {
        if(!this.on_changed_listeners.includes(listener))
        {
            this.on_changed_listeners.push(listener);
            return true;
        }

        return false;
    }

    public remove_listener(listener: (v: T | null) => void): boolean
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