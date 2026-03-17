import type { ItemDef } from '../roguelike/items.js';

const MAX_INVENTORY_SIZE = 20;

export class Inventory {
  private items: ItemDef[] = [];
  readonly maxSize: number = MAX_INVENTORY_SIZE;

  getItems(): ItemDef[] {
    return [...this.items];
  }

  addItem(item: ItemDef): boolean {
    if (this.items.length >= this.maxSize) return false;
    this.items.push(item);
    return true;
  }

  removeItem(index: number): ItemDef | undefined {
    if (index < 0 || index >= this.items.length) return undefined;
    return this.items.splice(index, 1)[0];
  }

  get size(): number {
    return this.items.length;
  }
}
