import { describe, it, expect } from 'vitest';
import { getItems, getItemById } from '../../src/roguelike/items.js';

describe('Items', () => {
  it('has 6 item definitions', () => {
    const items = getItems();
    expect(items.length).toBe(6);
  });

  it('each item has required fields', () => {
    const items = getItems();
    for (const item of items) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('type');
      expect(item).toHaveProperty('description');
    }
  });

  it('has correct item types', () => {
    const items = getItems();
    const types = items.map(i => i.type);
    expect(types).toContain('weapon');
    expect(types).toContain('armor');
    expect(types).toContain('consumable');
    expect(types).toContain('relic');
  });

  it('weapons have attack stat', () => {
    const items = getItems();
    const chainsword = items.find(i => i.id === 'chainsword');
    expect(chainsword).toBeDefined();
    expect(chainsword!.attack).toBeGreaterThan(0);
  });

  it('armor has defense stat', () => {
    const items = getItems();
    const armor = items.find(i => i.id === 'powerArmor');
    expect(armor).toBeDefined();
    expect(armor!.defense).toBeGreaterThan(0);
  });

  it('consumable has heal stat', () => {
    const items = getItems();
    const medKit = items.find(i => i.id === 'medKit');
    expect(medKit).toBeDefined();
    expect(medKit!.heal).toBeGreaterThan(0);
  });

  it('relic has tech stat', () => {
    const items = getItems();
    const stc = items.find(i => i.id === 'stcFragment');
    expect(stc).toBeDefined();
    expect(stc!.tech).toBeGreaterThan(0);
  });

  it('getItemById returns correct item', () => {
    const item = getItemById('bolter');
    expect(item).toBeDefined();
    expect(item!.name).toBe('Boltpistol');
  });

  it('getItemById returns undefined for unknown', () => {
    const item = getItemById('nonexistent');
    expect(item).toBeUndefined();
  });

  it('plasma gun has highest weapon damage', () => {
    const items = getItems();
    const weapons = items.filter(i => i.type === 'weapon');
    const plasma = weapons.find(i => i.id === 'plasmaGun');
    expect(plasma!.attack).toBeGreaterThan(weapons[0].attack!);
  });
});
