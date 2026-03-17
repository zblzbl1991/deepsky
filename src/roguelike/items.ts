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

export function getItems(): ItemDef[] {
  return itemsData;
}

export function getItemById(id: string): ItemDef | undefined {
  return itemsData.find((i: ItemDef) => i.id === id);
}
