import { describe, it, expect } from 'vitest';
import { TILE_SIZE, TILE_COLORS } from '../../src/render/tileset.js';

describe('Canvas Renderer Constants', () => {
  it('TILE_SIZE is 24 pixels', () => {
    expect(TILE_SIZE).toBe(24);
  });

  it('TILE_COLORS has wall color', () => {
    expect(TILE_COLORS.wall).toBe('#1a1a3e');
  });

  it('TILE_COLORS has floor color', () => {
    expect(TILE_COLORS.floor).toBe('#2a2a4e');
  });

  it('TILE_COLORS has exit color', () => {
    expect(TILE_COLORS.exit).toBe('#6cacff');
  });

  it('TILE_COLORS has fog color', () => {
    expect(TILE_COLORS.fog).toBe('#0a0a1f');
  });

  it('TILE_COLORS has player color', () => {
    expect(TILE_COLORS.player).toBe('#4a9');
  });

  it('TILE_COLORS has enemy color', () => {
    expect(TILE_COLORS.enemy).toBe('#e55');
  });

  it('TILE_COLORS has item color', () => {
    expect(TILE_COLORS.item).toBe('#5af');
  });

  it('TILE_COLORS has boss color', () => {
    expect(TILE_COLORS.boss).toBe('#e5f');
  });

  it('all tile colors are valid hex colors', () => {
    const hexRegex = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;
    for (const color of Object.values(TILE_COLORS)) {
      expect(hexRegex.test(color)).toBe(true);
    }
  });
});
