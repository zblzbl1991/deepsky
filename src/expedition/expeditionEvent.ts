import type { EnemyDef } from '../roguelike/entities.js';
import { getEnemiesForFloor, getBossForFloor } from '../roguelike/entities.js';
import type { ItemDef } from '../roguelike/items.js';
import { getItems } from '../roguelike/items.js';
import expeditionEventsData from '../data/expeditionEvents.json' assert { type: 'json' };

export interface CombatResult {
  victory: boolean;
  turnsUsed: number;
  hpRemaining: number;
  damageDealt: number;
  damageReceived: number;
  log: string[];
}

export interface ExploreOutcome {
  success: boolean;
  reward?: { type: 'exp' | 'resource'; resourceType?: string; value: number };
  damage?: number;
}

export interface EncounterEffect {
  type: 'heal_hp' | 'heal_mp' | 'buff' | 'exp';
  value: number;
  description: string;
}

export interface ExpeditionPlayer {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  classId: string;
}

export type ExpeditionEvent =
  | { type: 'combat'; enemy: EnemyDef; result?: CombatResult }
  | { type: 'loot'; description: string; lootType: 'resource' | 'item'; resourceType?: string; value?: number; itemId?: string; itemDef?: ItemDef }
  | { type: 'explore'; description: string; outcome?: ExploreOutcome }
  | { type: 'encounter'; description: string; effect?: EncounterEffect };

interface EventPoolEntry {
  id: string;
  type: string;
  descriptions: string[];
  successReward?: { type: string; value: number; resourceType?: string };
  failDamage?: number;
  effect?: { type: string; value: number };
  lootType?: string;
  resourceType?: string;
  value?: number;
  itemId?: string;
  itemIds?: string[];
}

const eventPool: EventPoolEntry[] = expeditionEventsData as EventPoolEntry[];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getEventCount(difficulty: number): number {
  return 5 + difficulty * 3;
}

export function generateExpeditionEvents(
  difficulty: number,
  _playerLevel: number,
  planetDangerLevel: number,
): ExpeditionEvent[] {
  const count = getEventCount(difficulty);
  const combatCount = Math.round(count * 0.4);

  // Slot 0: never combat, Slot last: always combat
  const combatSlots = new Set<number>();
  combatSlots.add(count - 1);

  let remaining = combatCount - 1;
  let attempts = 0;
  while (remaining > 0 && attempts < 200) {
    const candidates: number[] = [];
    for (let i = 1; i < count - 1; i++) {
      if (!combatSlots.has(i)) candidates.push(i);
    }
    if (candidates.length === 0) break;
    combatSlots.add(pickRandom(candidates));
    remaining--;
    attempts++;
  }

  // Re-generate if spacing constraint violated
  attempts = 0;
  while (!validateSpacing(combatSlots, count) && attempts < 100) {
    combatSlots.clear();
    combatSlots.add(count - 1);
    remaining = combatCount - 1;
    while (remaining > 0) {
      const candidates: number[] = [];
      for (let i = 1; i < count - 1; i++) {
        if (!combatSlots.has(i)) candidates.push(i);
      }
      if (candidates.length === 0) break;
      combatSlots.add(pickRandom(candidates));
      remaining--;
    }
    attempts++;
  }

  const explorePool = eventPool.filter(e => e.type === 'explore');
  const encounterPool = eventPool.filter(e => e.type === 'encounter');
  const lootPool = eventPool.filter(e => e.type === 'loot');

  const events: ExpeditionEvent[] = [];
  for (let i = 0; i < count; i++) {
    if (combatSlots.has(i)) {
      events.push(makeCombatEvent(i === count - 1, difficulty, planetDangerLevel));
    } else {
      events.push(makeNonCombatEvent(explorePool, encounterPool, lootPool));
    }
  }

  return events;
}

function validateSpacing(combatSlots: Set<number>, count: number): boolean {
  let streak = 0;
  for (let i = 0; i < count; i++) {
    if (combatSlots.has(i)) {
      if (streak > 2) return false;
      streak = 0;
    } else {
      streak++;
    }
  }
  return streak <= 2;
}

function makeCombatEvent(isLast: boolean, difficulty: number, planetDangerLevel: number): ExpeditionEvent {
  const floor = Math.max(1, planetDangerLevel);
  let enemy: EnemyDef;

  if (isLast && difficulty >= 2) {
    const boss = getBossForFloor(floor);
    enemy = boss ?? pickRandom(getEnemiesForFloor(floor));
  } else {
    enemy = pickRandom(getEnemiesForFloor(floor));
  }

  const mult = difficulty === 1 ? 0.8 : difficulty === 3 ? 1.3 : 1.0;
  const scaled: EnemyDef = {
    ...enemy,
    hp: Math.ceil(enemy.hp * mult),
    attack: Math.ceil(enemy.attack * mult),
    defense: Math.ceil(enemy.defense * mult),
  };

  return { type: 'combat', enemy: scaled };
}

function makeNonCombatEvent(
  explorePool: EventPoolEntry[],
  encounterPool: EventPoolEntry[],
  lootPool: EventPoolEntry[],
): ExpeditionEvent {
  const roll = Math.random();
  if (roll < 0.3) {
    return makeExploreEvent(pickRandom(explorePool));
  } else if (roll < 0.6) {
    return makeEncounterEvent(pickRandom(encounterPool));
  } else {
    return makeLootEvent(pickRandom(lootPool));
  }
}

function makeExploreEvent(entry: EventPoolEntry): ExpeditionEvent {
  const description = pickRandom(entry.descriptions);
  return { type: 'explore', description };
}

function makeEncounterEvent(entry: EventPoolEntry): ExpeditionEvent {
  const description = pickRandom(entry.descriptions);
  return {
    type: 'encounter',
    description,
    effect: entry.effect ? {
      type: entry.effect.type as 'heal_hp' | 'heal_mp' | 'buff' | 'exp',
      value: entry.effect.value,
      description: '',
    } : undefined,
  };
}

function makeLootEvent(entry: EventPoolEntry): ExpeditionEvent {
  const description = pickRandom(entry.descriptions);
  if (entry.lootType === 'item' && entry.itemId) {
    const itemDef = getItems().find(i => i.id === entry.itemId);
    return { type: 'loot', description, lootType: 'item', itemId: entry.itemId, itemDef };
  }
  if (entry.lootType === 'item' && entry.itemIds && entry.itemIds.length > 0) {
    const chosenId = pickRandom(entry.itemIds);
    const itemDef = getItems().find(i => i.id === chosenId);
    return { type: 'loot', description, lootType: 'item', itemId: chosenId, itemDef };
  }
  return {
    type: 'loot',
    description,
    lootType: 'resource',
    resourceType: entry.resourceType,
    value: entry.value,
  };
}
