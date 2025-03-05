
export type Listener<T> = (c: T) => void;

export class EventHandler<T>
{
    listeners: Listener<T>[];

    public constructor()
    {
        this.listeners = [];
    }

    public add_listener(listener: Listener<T>): boolean
    {
        if (!this.listeners.includes(listener))
        {
            this.listeners.push(listener);
            return true;
        }

        return false;
    }

    public remove_listener(listener: Listener<T>): boolean
    {
        return this.listeners.remove(listener);
    }

    public invoke(arg: T)
    {
        this.listeners.forEach(l => l(arg));
    }
}