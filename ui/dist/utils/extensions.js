Element.prototype.appendElement = function (key, builder) {
    let child = document.createElement(key);
    if (builder !== undefined) {
        builder(child);
    }
    this.appendChild(child);
    return this;
};
export {};
