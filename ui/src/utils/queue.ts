
export class Queue<T> 
{
    private items: T[] = [];

    public constructor(items: T[] = [])
    {
        this.items = items
    }

    public enqueue(item: T): void 
    {
        this.items.push(item);
    }

    public dequeue(): T | undefined 
    {
        return this.items.shift();
    }

    // Peek at the front item without removing
    public peek(): T | undefined 
    {
        return this.items[0];
    }

    public is_empty(): boolean 
    {
        return this.items.length === 0;
    }

    public size(): number 
    {
        return this.items.length;
    }

    public clear(): void 
    {
        this.items = [];
    }
}