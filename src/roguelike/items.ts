export interface ItemDef {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'consumable' | 'relic';
  attack?: number;
  defense?: number;
  heal?: number;
  tech?: number;
  description: string;
}

import itemsData from '../data/items.json' assert { type: 'json' };

const items: ItemDef[] = itemsData as ItemDef[];

export function getItems(): ItemDef[] {
  return items;
}

export function getItemById(id: string): ItemDef | undefined {
  return items.find((i) => i.id === id);
}
