class OrderedMap<T> {
  private content: (string | T)[];

  constructor(content: (string | T)[]) {
    this.content = content;
  }

  private find(key: string): number {
    for (let i = 0; i < this.content.length; i += 2) {
      if (this.content[i] === key) return i;
    }
    return -1;
  }

  get(key: string): T | undefined {
    const found = this.find(key);
    return found === -1 ? undefined : (this.content[found + 1] as T);
  }

  update(key: string, value: T, newKey?: string): OrderedMap<T> {
    let self = newKey && newKey !== key ? this.remove(newKey) : this;
    const found = self.find(key);
    const content = self.content.slice();

    if (found === -1) {
      content.push(newKey || key, value);
    } else {
      content[found + 1] = value;
      if (newKey) content[found] = newKey;
    }
    return new OrderedMap<T>(content);
  }

  remove(key: string): OrderedMap<T> {
    const found = this.find(key);
    if (found === -1) return this;
    const content = this.content.slice();
    content.splice(found, 2);
    return new OrderedMap<T>(content);
  }

  addToStart(key: string, value: T): OrderedMap<T> {
    return new OrderedMap<T>([key, value, ...this.remove(key).content]);
  }

  addToEnd(key: string, value: T): OrderedMap<T> {
    const content = this.remove(key).content.slice();
    content.push(key, value);
    return new OrderedMap<T>(content);
  }

  addBefore(place: string, key: string, value: T): OrderedMap<T> {
    const without = this.remove(key);
    const content = without.content.slice();
    const found = without.find(place);
    content.splice(found === -1 ? content.length : found, 0, key, value);
    return new OrderedMap<T>(content);
  }

  forEach(callback: (key: string, value: T) => void): void {
    for (let i = 0; i < this.content.length; i += 2) {
      callback(this.content[i] as string, this.content[i + 1] as T);
    }
  }

  prepend(map: OrderedMap<T> | Record<string, T>): OrderedMap<T> {
    const newMap = OrderedMap.from(map);
    return newMap.size === 0 ? this : new OrderedMap<T>([...newMap.content, ...this.subtract(newMap).content]);
  }

  append(map: OrderedMap<T> | Record<string, T>): OrderedMap<T> {
    const newMap = OrderedMap.from(map);
    return newMap.size === 0 ? this : new OrderedMap<T>([...this.subtract(newMap).content, ...newMap.content]);
  }

  subtract(map: OrderedMap<T> | Record<string, T>): OrderedMap<T> {
    let result = this as OrderedMap<T>;
    const newMap = OrderedMap.from(map);
    for (let i = 0; i < newMap.content.length; i += 2) {
      result = result.remove(newMap.content[i] as string);
    }
    return result;
  }

  toObject(): Record<string, T> {
    const result: Record<string, T> = {};
    this.forEach((key, value) => {
      result[key] = value;
    });
    return result;
  }

  get size(): number {
    return this.content.length >> 1;
  }

  static from<T>(value?: OrderedMap<T> | Record<string, T>): OrderedMap<T> {
    if (value instanceof OrderedMap) return value;
    const content: (string | T)[] = [];
    if (value) {
      for (const prop in value) {
        content.push(prop, value[prop]);
      }
    }
    return new OrderedMap<T>(content);
  }
}

export default OrderedMap;
