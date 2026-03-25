import type { Expedition } from '../expedition/expeditionEngine.js';
import { levelUpExp, getMilestoneBonuses } from '../player/classes.js';
import { eventBus } from './eventBus.js';

export type ResourceType = 'minerals' | 'energy' | 'tech' | 'alloys' | 'relics';

export interface Resources {
  minerals: number;
  energy: number;
  tech: number;
  alloys: number;
  relics: number;
}

export interface BuildingState {
  level: number;
  unlocked: boolean;
}

export interface PlayerState {
  class: string;
  level: number;
  exp: number;
  equipment: string[];
}

export interface SaveData {
  version: string;
  timestamp: number;
  resources: Resources;
  buildings: Record<string, BuildingState>;
  player: PlayerState;
  exploredPlanets: string[];
  techUnlocked: string[];
  shipsBuilt: string[];
  statistics: {
    totalPlayTime: number;
    deepestDungeon: number;
    relicsFound: number;
  };
  activeExpedition?: Expedition;
}

const DEFAULT_SAVE_VERSION = '0.1.0';

function defaultResources(): Resources {
  return { minerals: 0, energy: 0, tech: 0, alloys: 0, relics: 0 };
}

function defaultPlayer(): PlayerState {
  return { class: 'spaceMarine', level: 1, exp: 0, equipment: [] };
}

function defaultStatistics(): SaveData['statistics'] {
  return { totalPlayTime: 0, deepestDungeon: 0, relicsFound: 0 };
}

export class GameState {
  resources: Resources;
  buildings: Record<string, BuildingState> = {};
  player: PlayerState;
  exploredPlanets: string[] = [];
  techUnlocked: string[] = [];
  shipsBuilt: string[] = [];
  statistics: SaveData['statistics'];
  lastTickTime: number;
  activeExpedition?: Expedition;

  constructor() {
    this.resources = defaultResources();
    this.player = defaultPlayer();
    this.statistics = defaultStatistics();
    this.lastTickTime = Date.now();
  }

  addResource(type: ResourceType, amount: number): void {
    this.resources[type] += amount;
  }

  spendResource(type: ResourceType, amount: number): boolean {
    if (this.resources[type] < amount) return false;
    this.resources[type] -= amount;
    return true;
  }

  canAfford(cost: Partial<Resources>): boolean {
    return Object.entries(cost).every(
      ([key, val]) => this.resources[key as ResourceType] >= (val ?? 0)
    );
  }

  spendResources(cost: Partial<Resources>): boolean {
    if (!this.canAfford(cost)) return false;
    for (const [key, val] of Object.entries(cost)) {
      this.resources[key as ResourceType] -= (val ?? 0);
    }
    return true;
  }

  addExp(amount: number): number {
    this.player.exp += amount;
    let levelsGained = 0;
    while (this.player.exp >= levelUpExp(this.player.level)) {
      this.player.exp -= levelUpExp(this.player.level);
      this.player.level++;
      levelsGained++;
    }
    if (levelsGained > 0) {
      eventBus.emit('levelUp', this.player.level, getMilestoneBonuses(this.player.level));
    }
    return levelsGained;
  }

  toSaveData(): SaveData {
    return {
      version: DEFAULT_SAVE_VERSION,
      timestamp: Date.now(),
      resources: { ...this.resources },
      buildings: JSON.parse(JSON.stringify(this.buildings)),
      player: { ...this.player, equipment: [...this.player.equipment] },
      exploredPlanets: [...this.exploredPlanets],
      techUnlocked: [...this.techUnlocked],
      shipsBuilt: [...this.shipsBuilt],
      statistics: { ...this.statistics },
      activeExpedition: this.activeExpedition,
    };
  }

  fromSaveData(data: SaveData): void {
    this.resources = { ...data.resources };
    this.buildings = JSON.parse(JSON.stringify(data.buildings));
    this.player = { ...data.player, equipment: [...data.player.equipment] };
    this.exploredPlanets = [...data.exploredPlanets];
    this.techUnlocked = [...data.techUnlocked];
    this.shipsBuilt = [...data.shipsBuilt];
    this.statistics = { ...data.statistics };
    this.lastTickTime = Date.now();
    this.activeExpedition = data.activeExpedition;
  }
}

export function createGameState(): GameState {
  return new GameState();
}
