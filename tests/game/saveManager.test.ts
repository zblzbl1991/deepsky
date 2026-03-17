import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SaveManager } from '../../src/game/saveManager.js';
import { createGameState } from '../../src/game/gameState.js';

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
}));

import { get, set } from 'idb-keyval';
const mockGet = get as ReturnType<typeof vi.fn>;
const mockSet = set as ReturnType<typeof vi.fn>;

describe('SaveManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves game state to IndexedDB', async () => {
    mockSet.mockResolvedValue(undefined);
    const manager = new SaveManager();
    const state = createGameState();
    state.addResource('minerals', 200);

    await manager.save(state);

    expect(mockSet).toHaveBeenCalledWith('deep-sky-save', expect.objectContaining({
      resources: { minerals: 200, energy: 0, tech: 0, alloys: 0, relics: 0 },
    }));
  });

  it('loads game state from IndexedDB', async () => {
    const saveData = {
      version: '0.1.0',
      timestamp: Date.now(),
      resources: { minerals: 500, energy: 100, tech: 50, alloys: 30, relics: 5 },
      buildings: {},
      player: { class: 'inquisitor', level: 5, exp: 200, equipment: [] },
      exploredPlanets: ['tartarus'],
      techUnlocked: [],
      shipsBuilt: [],
      statistics: { totalPlayTime: 3600, deepestDungeon: 3, relicsFound: 2 },
    };
    mockGet.mockResolvedValue(saveData);

    const manager = new SaveManager();
    const state = createGameState();
    const loaded = await manager.load(state);

    expect(loaded).toBe(true);
    expect(state.resources.minerals).toBe(500);
    expect(state.player.class).toBe('inquisitor');
  });

  it('returns false when no save data exists', async () => {
    mockGet.mockResolvedValue(undefined);

    const manager = new SaveManager();
    const state = createGameState();
    const loaded = await manager.load(state);

    expect(loaded).toBe(false);
  });
});
