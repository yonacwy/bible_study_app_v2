declare global {
    export interface Element {
        appendElement<K extends keyof HTMLElementTagNameMap>(key: K, builder?: (k: HTMLElementTagNameMap[K]) => void): Element;
    }
}

Element.prototype.appendElement = function<K extends keyof HTMLElementTagNameMap>(key: K, builder?: (k: HTMLElementTagNameMap[K]) => void): Element {
    let child = document.createElement(key);
    if(builder !== undefined)
    {
        builder(child);
    }
    this.appendChild(child);
    return this;
};

declare global {
    export interface Array<T>
    {
        remove_at(index: number): T;
        remove(value: T): T;
    }
}

Array.prototype.remove_at = function<T>(index: number): T | undefined
{
    if (index > -1 && index < this.length) 
    {
        let element = this[index];
        this.splice(index, 1);
        return element
    }

    return undefined;
}

Array.prototype.remove = function<T>(value: T)
{
    let index = this.indexOf(value);
    this.remove_at(index);
}

export {};