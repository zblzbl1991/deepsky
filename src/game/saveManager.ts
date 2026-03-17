import { get, set } from 'idb-keyval';
import type { GameState, SaveData } from './gameState.js';

const SAVE_KEY = 'deep-sky-save';

export class SaveManager {
  async save(state: GameState): Promise<void> {
    const data = state.toSaveData();
    await set(SAVE_KEY, data);
  }

  async load(state: GameState): Promise<boolean> {
    const data = await get<SaveData>(SAVE_KEY);
    if (!data) return false;
    state.fromSaveData(data);
    return true;
  }
}
