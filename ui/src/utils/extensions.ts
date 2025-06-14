declare global {
    export interface Element {
        append_element<K extends keyof HTMLElementTagNameMap>(key: K, classes: string[], builder: (k: HTMLElementTagNameMap[K]) => void): HTMLElementTagNameMap[K];
        reverse_children(): Element;
    }
}

Element.prototype.append_element = function<K extends keyof HTMLElementTagNameMap>(key: K, classes: string[], builder: (k: HTMLElementTagNameMap[K]) => void): HTMLElementTagNameMap[K] {
    let child = document.createElement(key);
    child.classList.add(...classes);
    builder(child);
    this.appendChild(child);
    return child;
}

Element.prototype.reverse_children = function(this: Element): Element {
    let array = Array.from(this.children);
    array.forEach(c => c.remove());
    array.reverse();
    array.forEach(c => this.appendChild(c));
    return this;
}

declare global {
    export interface HTMLElement {
        hide(hidden: boolean): void;
    }
}

HTMLElement.prototype.hide = function(hidden: boolean): void 
{
    if(hidden)
    {
        this.classList.add('hidden');
    }
    else 
    {
        this.classList.remove('hidden');
    }
}

declare global {
    export interface Array<T>
    {
        remove_at(index: number): T;
        remove(value: T): boolean;
        filter_map<R>(predicate: (v: T) => R | null): R[];
        find_map<R>(predicate: (v: T) => R | null): R | undefined;
        any(p: (v: T) => boolean): boolean;
        all(p: (v: T) => boolean): boolean;
        flatten_promise<R>(): Promise<R[]>,
    }
}

Array.prototype.all = function<T>(p: (v: T) => boolean): boolean
{
    for(let i = 0; i < this.length; i++)
    {
        if (!p(this[i]))
        {
            return false;
        }
    }

    return true;
}

Array.prototype.any = function<T>(p: (v: T) => boolean): boolean
{
    for(let i = 0; i < this.length; i++)
    {
        if (p(this[i]))
        {
            return true;
        }
    }

    return false;
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

Array.prototype.flatten_promise = function<R>(this: Promise<R>[]): Promise<R[]> {
    return Promise.all(this);
}

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

declare global {
    interface String {
        limit_length(max: number, terminator: string): String;
    }
}

String.prototype.limit_length = function(this: String, max: number, terminator: string): String {
    let s = this.slice(0, Math.min(this.length, max));
    if(this.length > max)
    {
        return s + terminator;
    }

    return s;
}

export {};