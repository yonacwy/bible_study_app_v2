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

export {};