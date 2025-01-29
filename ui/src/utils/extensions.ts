declare global {
    export interface Element {
        appendElement<K extends keyof HTMLElementTagNameMap>(key: K, builder?: (k: HTMLElementTagNameMap[K]) => void): Element;
        appendElementEx<K extends keyof HTMLElementTagNameMap>(key: K, classes: string[], builder: (k: HTMLElementTagNameMap[K]) => void): Element;
    }
}

Element.prototype.appendElement = function<K extends keyof HTMLElementTagNameMap>(key: K, builder?: (k: HTMLElementTagNameMap[K]) => void): Element {
    let child = document.createElement(key);
    if(builder !== undefined)
    {
        builder(child);
    }
    this.appendChild(child);
    return child;
};

Element.prototype.appendElementEx = function<K extends keyof HTMLElementTagNameMap>(key: K, classes: string[], builder: (k: HTMLElementTagNameMap[K]) => void): Element {
    let child = document.createElement(key);
    child.classList.add(...classes);
    builder(child);
    this.appendChild(child);
    return child;
}

declare global {
    export interface Array<T>
    {
        remove_at(index: number): T;
        remove(value: T): boolean;
        filter_map<R>(predicate: (v: T) => R | null): R[];
        find_map<R>(predicate: (v: T) => R | null): R | undefined;
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

Array.prototype.remove = function<T>(value: T): boolean
{
    let index = this.indexOf(value);
    if(index === -1)
    {
        return false;
    }

    this.remove_at(index);
    return true;
}

Array.prototype.filter_map = function<T, R>(this: T[], predicate: (v: T) => R | null): R[] {
    let array: R[] = [];
    this.forEach((v) => {
        const result = predicate(v);
        if (result != null) 
        {
            array.push(result);
        }
    });

    return array;
};

Array.prototype.find_map = function<T, R>(this: T[], predicate: (v: T) => R | null): R | undefined
{
    for(let i = 0; i < this.length; i++)
    {
        let v = predicate(this[i]);
        if (v !== null)
        {
            return v;
        }
    }

    return undefined;
}

declare global {
    interface Math {
        lerp(min: number, max: number, v: number): number;
        clamp(min: number, max: number, v: number): number;
        inv_lerp(min: number, max: number, v: number): number;
        approx_eq(a: number, b: number, epsilon?: number): boolean;
    }
}

Math.lerp = (min: number, max: number, v: number): number => {
    let diff = max - min;
    return min + diff * Math.clamp(0, 1, v);
}

Math.clamp = (min: number, max: number, v: number): number => {
    if (v > max) return max;
    if (v < min) return min;
    return v;
}

Math.inv_lerp = (min: number, max: number, v: number): number => {
    v = Math.clamp(min, max, v);
    return (v - min) / (max - min);
}

Math.approx_eq = (a: number, b: number, epsilon?: number): boolean => {
    return Math.abs(a - b) < (epsilon ?? 0.01);
}

export {};