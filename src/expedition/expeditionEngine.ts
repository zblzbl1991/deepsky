import type { ExpeditionEvent, ExpeditionPlayer, CombatResult } from './expeditionEvent.js';
import { generateExpeditionEvents } from './expeditionEvent.js';
import { simulateAutoCombat } from './autoCombat.js';
import { getPlanetDef } from '../starmap/planets.js';
import { getClassDef, getMilestoneBonuses } from '../player/classes.js';
import { getTechCombatBonus } from '../tech/techEffects.js';
import type { ResourceType } from '../game/gameState.js';

export interface LootItem {
  itemId: string;
  name: string;
}

export interface Expedition {
  id: string;
  planetId: string;
  difficulty: 1 | 2 | 3;
  status: 'pending' | 'active' | 'success' | 'failed';
  currentEventIndex: number;
  events: ExpeditionEvent[];
  player: ExpeditionPlayer;
  loot: LootItem[];
  expGained: number;
  resourcesGained: Partial<Record<ResourceType, number>>;
  startTime: number;
}

export function getPlayerStats(
  level: number,
  classId: string,
  techUnlocked: string[],
): { maxHp: number; maxMp: number; attack: number; defense: number } {
  const classDef = getClassDef(classId);

  const maxHp = 100 + level * 10 + (classDef?.hpBonus ?? 0);
  const maxMp = 50 + level * 5;
  const attack = 10 + level * 2 + (classDef?.attackBonus ?? 0);
  const defense = 3 + level + (classDef?.defenseBonus ?? 0);

  const combatBonus = getTechCombatBonus(techUnlocked);
  const milestone = getMilestoneBonuses(level);

  return {
    maxHp: maxHp + milestone.expeditionHpBonus,
    maxMp,
    attack: attack + combatBonus.attack,
    defense: defense + combatBonus.defense,
  };
}

export function createExpedition(
  planetId: string,
  difficulty: 1 | 2 | 3,
  classId: string,
  playerLevel: number,
  techUnlocked: string[] = [],
): Expedition {
  const planet = getPlanetDef(planetId);
  if (!planet) throw new Error(`Planet not found: ${planetId}`);

  const stats = getPlayerStats(playerLevel, classId, techUnlocked);

  const events = generateExpeditionEvents(difficulty, playerLevel, planet.dangerLevel);

  return {
    id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    planetId,
    difficulty,
    status: 'active',
    currentEventIndex: 0,
    events,
    player: {
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      mp: stats.maxMp,
      maxMp: stats.maxMp,
      attack: stats.attack,
      defense: stats.defense,
      classId,
    },
    loot: [],
    expGained: 0,
    resourcesGained: {},
    startTime: Date.now(),
  };
}

export function advanceExpedition(exp: Expedition): void {
  if (exp.status !== 'active') return;

  const event = exp.events[exp.currentEventIndex];
  if (!event) return;

  switch (event.type) {
    case 'combat':
      resolveCombat(exp, event);
      break;
    case 'explore':
      resolveExplore(exp, event);
      break;
    case 'encounter':
      resolveEncounter(exp, event);
      break;
    case 'loot':
      resolveLoot(exp, event);
      break;
  }

  if (exp.player.hp <= 0) {
    exp.status = 'failed';
    return;
  }

  exp.currentEventIndex++;
  if (exp.currentEventIndex >= exp.events.length) {
    exp.status = 'success';
  }
}

function resolveCombat(exp: Expedition, event: ExpeditionEvent & { type: 'combat' }): void {
  const result: CombatResult = simulateAutoCombat(exp.player, event.enemy);
  event.result = result;

  if (result.victory) {
    exp.player.hp = result.hpRemaining;
    exp.expGained += event.enemy.exp;
  } else {
    exp.player.hp = 0;
  }
}

function resolveExplore(exp: Expedition, event: ExpeditionEvent & { type: 'explore' }): void {
  const successChance = Math.min(0.85, 0.5 + exp.player.defense * 0.02);
  const success = Math.random() < successChance;

  if (success) {
    exp.expGained += 10;
    event.outcome = { success: true, reward: { type: 'exp', value: 10 } };
  } else {
    const damage = 5 + Math.floor(Math.random() * 5);
    exp.player.hp = Math.max(0, exp.player.hp - damage);
    event.outcome = { success: false, damage };
  }
}

function resolveEncounter(exp: Expedition, event: ExpeditionEvent & { type: 'encounter' }): void {
  if (!event.effect) return;

  switch (event.effect.type) {
    case 'heal_hp':
      exp.player.hp = Math.min(exp.player.maxHp, exp.player.hp + event.effect.value);
      break;
    case 'heal_mp':
      exp.player.mp = Math.min(exp.player.maxMp, exp.player.mp + event.effect.value);
      break;
    case 'exp':
      exp.expGained += event.effect.value;
      break;
    case 'buff':
      exp.player.attack += event.effect.value;
      break;
  }
}

function resolveLoot(exp: Expedition, event: ExpeditionEvent & { type: 'loot' }): void {
  if (event.lootType === 'item' && event.itemId && event.itemDef) {
    exp.loot.push({ itemId: event.itemId, name: event.itemDef.name });
  } else if (event.lootType === 'resource' && event.resourceType && event.value) {
    const resType = event.resourceType as ResourceType;
    exp.resourcesGained[resType] = (exp.resourcesGained[resType] || 0) + event.value;
  }
}

export function settleExpedition(exp: Expedition): {
  expGained: number;
  loot: LootItem[];
  resourcesGained: Partial<Record<ResourceType, number>>;
  failedLoot: LootItem[];
} {
  if (exp.status === 'failed') {
    const lostCount = Math.floor(exp.loot.length / 2);
    const shuffled = [...exp.loot].sort(() => Math.random() - 0.5);
    const kept = shuffled.slice(lostCount);
    const lost = shuffled.slice(0, lostCount);
    return {
      expGained: exp.expGained,
      loot: kept,
      resourcesGained: { ...exp.resourcesGained },
      failedLoot: lost,
    };
  }

  return {
    expGained: exp.expGained,
    loot: [...exp.loot],
    resourcesGained: { ...exp.resourcesGained },
    failedLoot: [],
  };
}
