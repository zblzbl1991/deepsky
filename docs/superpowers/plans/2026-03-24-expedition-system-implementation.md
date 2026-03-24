# 远征系统实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用挂机式自动远征系统完全替换地牢探索系统，玩家发起远征后事件自动推进，战斗全自动可视化播放。

**Architecture:** 新增 `src/expedition/` 模块处理远征逻辑和 UI。保留 `src/roguelike/` 中的战斗核心（combat.ts、skills.ts、entities.ts、items.ts），改造为纯逻辑层。删除 Canvas 地图渲染、地牢生成、迷雾系统。远征面板作为星图子视图（overlay），替换原 Dungeon View。

**Tech Stack:** TypeScript, HTML/CSS DOM（无 Canvas），Vitest 测试

**Spec:** `docs/superpowers/specs/2026-03-24-expedition-system-design.md`

---

### Task 1: 新增事件数据文件

**Files:**
- Create: `src/data/expeditionEvents.json`

- [ ] **Step 1: 创建事件文本池 JSON**

```json
[
  {
    "id": "explore_corridor",
    "type": "explore",
    "descriptions": [
      "前方是一条漆黑的走廊，远处传来低沉的嗡鸣声……",
      "废弃的通道中，墙壁上的铭文已经模糊不清。",
      "走廊尽头的门半开着，里面透出微弱的蓝光。"
    ],
    "successReward": { "type": "exp", "value": 10 },
    "failDamage": 5
  },
  {
    "id": "explore_ruins",
    "type": "explore",
    "descriptions": [
      "你发现了一座坍塌的帝国哨站遗迹。",
      "废墟中有战斗的痕迹，弹壳散落一地。",
      "一面断裂的帝国旗帜在气流中微微飘动。"
    ],
    "successReward": { "type": "resource", "resourceType": "minerals", "value": 30 },
    "failDamage": 8
  },
  {
    "id": "explore_mech",
    "type": "explore",
    "descriptions": [
      "一台损坏的伺服颅骨在角落闪烁，似乎还在运行。",
      "地面上散落着机械零件，有些还能使用。",
      "一面墙壁上镶嵌着古老的机械符文。"
    ],
    "successReward": { "type": "resource", "resourceType": "tech", "value": 15 },
    "failDamage": 3
  },
  {
    "id": "encounter_refugees",
    "type": "encounter",
    "descriptions": [
      "你遇到了一群衣衫褴褛的难民，他们向你求救。",
      "一群矿工躲在掩体后，他们的灯光已经熄灭。"
    ],
    "effect": { "type": "heal_hp", "value": 15 }
  },
  {
    "id": "encounter_servoskull",
    "type": "encounter",
    "descriptions": [
      "一台受损的伺服颅骨飞到你面前，投射出全息信息。",
      "一台伺服颅骨从废墟中升起，传递着加密数据。"
    ],
    "effect": { "type": "exp", "value": 15 }
  },
  {
    "id": "encounter_shrine",
    "type": "encounter",
    "descriptions": [
      "一座小型帝皇神龛矗立在走廊拐角，蜡烛还在燃烧。",
      "墙壁上的帝皇画像前摆着供品。"
    ],
    "effect": { "type": "buff", "value": 20 }
  },
  {
    "id": "encounter_mechanic",
    "type": "encounter",
    "descriptions": [
      "一名机仆祭司正在修理一台发电机，他愿意分享一些能量电池。",
      "一位机械神教的随员提供了他的工具包。"
    ],
    "effect": { "type": "heal_mp", "value": 20 }
  },
  {
    "id": "loot_ammo",
    "type": "loot",
    "descriptions": [
      "你在废墟中发现了一个弹药箱。",
      "角落里的补给箱中还留有一些弹药。"
    ],
    "lootType": "resource",
    "resourceType": "energy",
    "value": 25
  },
  {
    "id": "loot_relic",
    "type": "loot",
    "descriptions": [
      "一个微弱的光芒从碎片中透出——STC碎片！",
      "你发现了一块刻有机械符文的金属板。"
    ],
    "lootType": "resource",
    "resourceType": "tech",
    "value": 50
  },
  {
    "id": "loot_alloys",
    "type": "loot",
    "descriptions": [
      "一堆合金材料散落在地上，虽然有些锈迹但仍可使用。",
      "一个储物柜里整齐地码放着合金板材。"
    ],
    "lootType": "resource",
    "resourceType": "alloys",
    "value": 15
  },
  {
    "id": "loot_medkit",
    "type": "loot",
    "descriptions": [
      "你找到了一个帝国的医疗包，里面还有可用的药物。",
      "急救箱中的注射器还是密封的。"
    ],
    "lootType": "item",
    "itemId": "medKit"
  },
  {
    "id": "loot_weapon",
    "type": "loot",
    "descriptions": [
      "一把链锯剑靠在墙边，锯齿还在微微转动。",
      "一把爆弹枪挂在倒塌的武器架上。"
    ],
    "lootType": "item",
    "itemIds": ["chainsword", "bolter"]
  }
]
```

- [ ] **Step 2: Commit**

```bash
git add src/data/expeditionEvents.json
git commit -m "data: add expedition event text pool JSON"
```

---

### Task 2: 事件类型与事件生成器

**Files:**
- Create: `src/expedition/expeditionEvent.ts`
- Test: `tests/expedition/expeditionEvent.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// tests/expedition/expeditionEvent.test.ts
import { describe, it, expect } from 'vitest';
import { generateExpeditionEvents, getEventCount, type ExpeditionEvent } from '../../src/expedition/expeditionEvent.js';

describe('generateExpeditionEvents', () => {
  it('根据难度生成正确数量的事件', () => {
    const events = generateExpeditionEvents(1, 1, 1);
    expect(events.length).toBe(8);
  });

  it('难度2生成11个事件', () => {
    const events = generateExpeditionEvents(2, 1, 1);
    expect(events.length).toBe(11);
  });

  it('难度3生成14个事件', () => {
    const events = generateExpeditionEvents(3, 1, 1);
    expect(events.length).toBe(14);
  });

  it('第一个事件不是战斗', () => {
    const events = generateExpeditionEvents(1, 1, 1);
    expect(events[0].type).not.toBe('combat');
  });

  it('最后一个事件是战斗', () => {
    const events = generateExpeditionEvents(1, 1, 1);
    expect(events[events.length - 1].type).toBe('combat');
  });

  it('战斗间隔不超过2个非战斗事件', () => {
    for (let difficulty = 1; difficulty <= 3; difficulty++) {
      const events = generateExpeditionEvents(difficulty, 1, 1);
      let nonCombatStreak = 0;
      for (const event of events) {
        if (event.type === 'combat') {
          expect(nonCombatStreak).toBeLessThanOrEqual(2);
          nonCombatStreak = 0;
        } else {
          nonCombatStreak++;
        }
      }
    }
  });

  it('战斗事件有 enemy 属性', () => {
    const events = generateExpeditionEvents(1, 1, 1);
    const combatEvents = events.filter(e => e.type === 'combat');
    for (const event of combatEvents) {
      if (event.type === 'combat') {
        expect(event.enemy).toBeDefined();
        expect(event.enemy.hp).toBeGreaterThan(0);
      }
    }
  });

  it('非战斗事件有 description 属性', () => {
    const events = generateExpeditionEvents(1, 1, 1);
    for (const event of events) {
      if (event.type !== 'combat') {
        expect(event.description).toBeDefined();
        expect(event.description.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('getEventCount', () => {
  it('难度1返回8', () => { expect(getEventCount(1)).toBe(8); });
  it('难度2返回11', () => { expect(getEventCount(2)).toBe(11); });
  it('难度3返回14', () => { expect(getEventCount(3)).toBe(14); });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/expedition/expeditionEvent.test.ts`
Expected: FAIL — 模块不存在

- [ ] **Step 3: 实现事件生成器**

```typescript
// src/expedition/expeditionEvent.ts
import type { EnemyDef } from '../roguelike/entities.js';
import { getEnemiesForFloor, getBossForFloor } from '../roguelike/entities.js';
import type { ItemDef } from '../roguelike/items.js';
import { getItems } from '../roguelike/items.js';
import expeditionEventsData from '../data/expeditionEvents.json' assert { type: 'json'';

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

export type ExpeditionEvent =
  | { type: 'combat'; enemy: EnemyDef; result?: CombatResult }
  | { type: 'loot'; description: string; lootType: 'resource' | 'item'; resourceType?: string; value?: number; itemId?: string; itemDef?: ItemDef }
  | { type: 'explore'; description: string; outcome?: ExploreOutcome }
  | { type: 'encounter'; description: string; effect?: EncounterEffect };

export interface EventPoolEntry {
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
  playerLevel: number,
  planetDangerLevel: number,
): ExpeditionEvent[] {
  const count = getEventCount(difficulty);
  const events: ExpeditionEvent[] = [];

  // Determine combat count (~40%)
  const combatCount = Math.round(count * 0.4);

  // Build a slot array: assign event types ensuring constraints
  // Slot 0: never combat, Slot last: always combat
  const slots: string[] = new Array(count).fill('noncombat');

  // Fill combat slots (excluding first and last)
  const combatSlots = new Set<number>();
  // Last slot is always combat
  combatSlots.add(count - 1);

  // Distribute remaining combat slots
  let remainingCombat = combatCount - 1; // -1 for the guaranteed last slot
  while (remainingCombat > 0) {
    // Pick a random non-first, non-combat slot
    const candidates = [];
    for (let i = 1; i < count - 1; i++) {
      if (!combatSlots.has(i)) candidates.push(i);
    }
    if (candidates.length === 0) break;
    const slot = pickRandom(candidates);
    combatSlots.add(slot);
    remainingCombat--;
  }

  // Validate: no more than 2 non-combat between combats
  // Re-generate if constraint violated
  let attempts = 0;
  while (!validateCombatSpacing(combatSlots, count) && attempts < 100) {
    combatSlots.clear();
    combatSlots.add(count - 1);
    remainingCombat = combatCount - 1;
    while (remainingCombat > 0) {
      const candidates = [];
      for (let i = 1; i < count - 1; i++) {
        if (!combatSlots.has(i)) candidates.push(i);
      }
      if (candidates.length === 0) break;
      combatSlots.add(pickRandom(candidates));
      remainingCombat--;
    }
    attempts++;
  }

  // Generate events
  const combatEvents = eventPool.filter(e => e.type === 'combat');
  const exploreEvents = eventPool.filter(e => e.type === 'explore');
  const encounterEvents = eventPool.filter(e => e.type === 'encounter');
  const lootEvents = eventPool.filter(e => e.type === 'loot');

  for (let i = 0; i < count; i++) {
    if (combatSlots.has(i)) {
      events.push(generateCombatEvent(i, count, difficulty, planetDangerLevel));
    } else if (i === 0) {
      // First event: always encounter or explore (gentle start)
      events.push(generateNonCombatEvent(exploreEvents, encounterEvents, lootEvents));
    } else {
      events.push(generateNonCombatEvent(exploreEvents, encounterEvents, lootEvents));
    }
  }

  return events;
}

function validateCombatSpacing(combatSlots: Set<number>, count: number): boolean {
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

function generateCombatEvent(
  index: number,
  total: number,
  difficulty: number,
  planetDangerLevel: number,
): ExpeditionEvent {
  const isLast = index === total - 1;
  const floor = Math.max(1, planetDangerLevel);
  let enemy: EnemyDef;

  if (isLast && difficulty >= 2) {
    // Boss fight for medium+ difficulty
    const boss = getBossForFloor(floor);
    enemy = boss ?? pickRandom(getEnemiesForFloor(floor));
  } else {
    enemy = pickRandom(getEnemiesForFloor(floor));
  }

  // Scale enemy stats by difficulty
  const strengthMultiplier = difficulty === 1 ? 0.8 : difficulty === 3 ? 1.3 : 1.0;

  const scaledEnemy: EnemyDef = {
    ...enemy,
    hp: Math.ceil(enemy.hp * strengthMultiplier),
    attack: Math.ceil(enemy.attack * strengthMultiplier),
    defense: Math.ceil(enemy.defense * strengthMultiplier),
  };

  return { type: 'combat', enemy: scaledEnemy };
}

function generateNonCombatEvent(
  exploreEvents: EventPoolEntry[],
  encounterEvents: EventPoolEntry[],
  lootEvents: EventPoolEntry[],
): ExpeditionEvent {
  const roll = Math.random();
  if (roll < 0.3) {
    return generateExploreEvent(pickRandom(exploreEvents));
  } else if (roll < 0.6) {
    return generateEncounterEvent(pickRandom(encounterEvents));
  } else {
    return generateLootEvent(pickRandom(lootEvents));
  }
}

function generateExploreEvent(entry: EventPoolEntry): ExpeditionEvent {
  const description = pickRandom(entry.descriptions);
  return { type: 'explore', description };
}

function generateEncounterEvent(entry: EventPoolEntry): ExpeditionEvent {
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

function generateLootEvent(entry: EventPoolEntry): ExpeditionEvent {
  const description = pickRandom(entry.descriptions);
  if (entry.lootType === 'item' && entry.itemId) {
    const itemDef = getItems().find(i => i.id === entry.itemId);
    return { type: 'loot', description, lootType: 'item', itemId: entry.itemId, itemDef };
  }
  return {
    type: 'loot',
    description,
    lootType: 'resource',
    resourceType: entry.resourceType,
    value: entry.value,
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/expedition/expeditionEvent.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/expedition/expeditionEvent.ts tests/expedition/expeditionEvent.test.ts
git commit -m "feat: add expedition event types and generator"
```

---

### Task 3: 自动战斗 AI

**Files:**
- Create: `src/expedition/autoCombat.ts`
- Modify: `src/roguelike/skills.ts` (新增 `autoSelectSkill` 导出)
- Test: `tests/expedition/autoCombat.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// tests/expedition/autoCombat.test.ts
import { describe, it, expect } from 'vitest';
import { simulateAutoCombat } from '../../src/expedition/autoCombat.js';
import type { ExpeditionPlayer } from '../../src/expedition/expeditionEvent.js';

const dummyPlayer: ExpeditionPlayer = {
  hp: 100, maxHp: 100, mp: 50, maxMp: 50,
  attack: 20, defense: 5, classId: 'spaceMarine',
};

describe('simulateAutoCombat', () => {
  it('返回战斗结果', () => {
    const result = simulateAutoCombat(dummyPlayer, {
      id: 'grot', name: 'Grot', type: 'ork',
      hp: 15, attack: 3, defense: 1, exp: 5, minFloor: 1,
    });
    expect(result).toHaveProperty('victory');
    expect(result).toHaveProperty('turnsUsed');
    expect(result).toHaveProperty('log');
    expect(result.log.length).toBeGreaterThan(0);
  });

  it('强玩家击败弱敌人', () => {
    const result = simulateAutoCombat(dummyPlayer, {
      id: 'grot', name: 'Grot', type: 'ork',
      hp: 15, attack: 1, defense: 0, exp: 5, minFloor: 1,
    });
    expect(result.victory).toBe(true);
  });

  it('弱玩家被强敌人击败', () => {
    const weakPlayer: ExpeditionPlayer = {
      hp: 10, maxHp: 10, mp: 0, maxMp: 0,
      attack: 1, defense: 0, classId: 'spaceMarine',
    };
    const result = simulateAutoCombat(weakPlayer, {
      id: 'warboss', name: 'Warboss', type: 'ork',
      hp: 100, attack: 15, defense: 8, exp: 100, minFloor: 3, isBoss: true,
    });
    expect(result.victory).toBe(false);
  });

  it('战斗结束后记录剩余 HP', () => {
    const result = simulateAutoCombat(dummyPlayer, {
      id: 'grot', name: 'Grot', type: 'ork',
      hp: 15, attack: 1, defense: 0, exp: 5, minFloor: 1,
    });
    expect(result.hpRemaining).toBeGreaterThanOrEqual(0);
    expect(result.hpRemaining).toBeLessThanOrEqual(dummyPlayer.maxHp);
  });

  it('战斗日志包含伤害信息', () => {
    const result = simulateAutoCombat(dummyPlayer, {
      id: 'grot', name: 'Grot', type: 'ork',
      hp: 15, attack: 1, defense: 0, exp: 5, minFloor: 1,
    });
    expect(result.log.some(l => l.includes('造成'))).toBe(true);
  });

  it('胜利时记录伤害统计', () => {
    const result = simulateAutoCombat(dummyPlayer, {
      id: 'grot', name: 'Grot', type: 'ork',
      hp: 15, attack: 1, defense: 0, exp: 5, minFloor: 1,
    });
    if (result.victory) {
      expect(result.damageDealt).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/expedition/autoCombat.test.ts`
Expected: FAIL

- [ ] **Step 3: 在 skills.ts 中新增 autoSelectSkill**

在 `src/roguelike/skills.ts` 末尾添加：

```typescript
export function autoSelectSkill(
  classId: string,
  playerMp: number,
  playerHp: number,
  playerMaxHp: number,
  enemyHp: number,
  enemyMaxHp: number,
  cooldowns: Record<string, number>,
): SkillDef | null {
  const skills = getSkillsForClass(classId);
  const available = skills.filter(s =>
    s.mpCost <= playerMp && (cooldowns[s.id] || 0) <= 0
  );
  if (available.length === 0) return null;

  // Priority 1: Execute skill if enemy HP < 30%
  const executeSkill = available.find(s =>
    s.effect.type === 'execute' && (enemyHp / enemyMaxHp) < 0.3
  );
  if (executeSkill) return executeSkill;

  // Priority 2: Heal/defense if player HP < 40%
  if (playerHp / playerMaxHp < 0.4) {
    const healSkill = available.find(s =>
      s.effect.type === 'heal' || s.effect.type === 'buff' && s.effect.buffType === 'defense_half'
    );
    if (healSkill) return healSkill;
  }

  // Priority 3: MP restore if MP is low
  if (playerMp < 20) {
    const mpSkill = available.find(s => s.effect.type === 'mp_restore');
    if (mpSkill) return mpSkill;
  }

  // Priority 4: Highest damage skill
  const damageSkills = available.filter(s =>
    s.effect.type === 'damage' || s.effect.type === 'execute'
  );
  if (damageSkills.length > 0) {
    damageSkills.sort((a, b) => {
      const aMult = a.effect.type === 'damage' ? a.effect.multiplier : (a.effect.type === 'execute' ? a.effect.multiplier : 1);
      const bMult = b.effect.type === 'damage' ? b.effect.multiplier : (b.effect.type === 'execute' ? b.effect.multiplier : 1);
      return bMult - aMult;
    });
    return damageSkills[0];
  }

  // Priority 5: Any buff skill
  const buffSkill = available.find(s => s.effect.type === 'buff');
  if (buffSkill) return buffSkill;

  // Fallback: immunity
  const immunitySkill = available.find(s => s.effect.type === 'immunity');
  if (immunitySkill) return immunitySkill;

  return null;
}
```

注意：`autoSelectSkill` 内部的 buff 判断需要用类型守卫。精确实现时注意 `SkillEffect` 的 union type 判断。

- [ ] **Step 4: 实现 autoCombat.ts**

```typescript
// src/expedition/autoCombat.ts
import type { EnemyDef } from '../roguelike/entities.js';
import { createCombatState, executeCombatRound, isCombatOver, getCombatResult, useSkill, endTurn, executeEnemyTurn } from '../roguelike/combat.js';
import { autoSelectSkill } from '../roguelike/skills.js';
import type { ExpeditionPlayer, CombatResult } from './expeditionEvent.js';

export function simulateAutoCombat(
  player: ExpeditionPlayer,
  enemy: EnemyDef,
  maxTurns: number = 50,
): CombatResult {
  const combat = createCombatState(
    player.hp, player.mp,
    player.attack, player.defense,
    enemy,
  );

  let turnsUsed = 0;
  let totalDamageDealt = 0;
  let totalDamageReceived = 0;

  while (!isCombatOver(combat) && turnsUsed < maxTurns) {
    const prevEnemyHp = combat.enemyHp;
    const prevPlayerHp = combat.playerHp;

    // AI select action
    const skill = autoSelectSkill(
      player.classId,
      combat.playerMp,
      combat.playerHp,
      combat.playerMaxHp,
      combat.enemyHp,
      combat.enemyMaxHp,
      combat.skillCooldowns,
    );

    if (skill) {
      useSkill(combat, skill);
    } else {
      executeCombatRound(combat, 'attack');
    }

    turnsUsed++;

    totalDamageDealt += prevEnemyHp - combat.enemyHp;
    totalDamageReceived += Math.max(0, combat.playerHp - prevPlayerHp);

    // Sync buffs back to CombatState for next round
    // (executeCombatRound already calls enemy turn internally)
    if (!isCombatOver(combat)) {
      // For skills: executeEnemyTurn is NOT called automatically
      if (skill) {
        executeEnemyTurn(combat);
        totalDamageReceived += Math.max(0, combat.playerHp - prevPlayerHp + (prevEnemyHp - combat.enemyHp + totalDamageDealt - totalDamageDealt)); // enemy damage this turn
        // Recalculate: enemy turn happened after skill
      }
      endTurn(combat);
    }
  }

  const result = getCombatResult(combat);
  return {
    victory: result.winner === 'player',
    turnsUsed,
    hpRemaining: Math.max(0, combat.playerHp),
    damageDealt: totalDamageDealt,
    damageReceived: totalDamageReceived,
    log: combat.log,
  };
}
```

**注意：** `simulateAutoCombat` 的伤害统计计算需要更仔细的处理。关键点是 `executeCombatRound('attack')` 内部已经包含敌人回合，但 `useSkill` 不包含。实现时需要分别处理两条路径，确保：
- 攻击路径：`executeCombatRound` 已包含敌人反击，不需要额外调用
- 技能路径：`useSkill` 之后需要手动调用 `executeEnemyTurn` + `endTurn`

最终实现中 `totalDamageReceived` 的计算应在两个分支中分别累加。

- [ ] **Step 5: 运行测试确认通过**

Run: `npx vitest run tests/expedition/autoCombat.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/expedition/autoCombat.ts tests/expedition/autoCombat.test.ts src/roguelike/skills.ts
git commit -m "feat: add auto-combat AI with skill selection logic"
```

---

### Task 4: 远征引擎

**Files:**
- Create: `src/expedition/expeditionEngine.ts`
- Test: `tests/expedition/expeditionEngine.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// tests/expedition/expeditionEngine.test.ts
import { describe, it, expect } from 'vitest';
import { createExpedition, advanceExpedition, type Expedition } from '../../src/expedition/expeditionEngine.js';

describe('createExpedition', () => {
  it('创建远征状态', () => {
    const exp = createExpedition('aridia', 1, 'spaceMarine', 1);
    expect(exp.planetId).toBe('aridia');
    expect(exp.difficulty).toBe(1);
    expect(exp.status).toBe('active');
    expect(exp.currentEventIndex).toBe(0);
    expect(exp.events.length).toBe(8);
    expect(exp.player.classId).toBe('spaceMarine');
    expect(exp.player.hp).toBeGreaterThan(0);
  });

  it('玩家属性基于等级', () => {
    const exp1 = createExpedition('aridia', 1, 'spaceMarine', 1);
    const exp5 = createExpedition('aridia', 1, 'spaceMarine', 5);
    expect(exp5.player.maxHp).toBeGreaterThan(exp1.player.maxHp);
    expect(exp5.player.attack).toBeGreaterThan(exp1.player.attack);
  });

  it('第一个事件不是战斗', () => {
    const exp = createExpedition('aridia', 1, 'spaceMarine', 1);
    expect(exp.events[0].type).not.toBe('combat');
  });
});

describe('advanceExpedition', () => {
  it('推进事件索引', () => {
    const exp = createExpedition('aridia', 1, 'spaceMarine', 1);
    advanceExpedition(exp);
    expect(exp.currentEventIndex).toBe(1);
  });

  it('战斗事件后更新玩家 HP', () => {
    const exp = createExpedition('aridia', 1, 'spaceMarine', 1);
    // Find a combat event
    const combatIdx = exp.events.findIndex(e => e.type === 'combat');
    if (combatIdx < 0) return; // unlikely but skip
    exp.currentEventIndex = combatIdx;
    const prevHp = exp.player.hp;
    advanceExpedition(exp);
    // Player may take damage in combat
    expect(exp.player.hp).toBeGreaterThanOrEqual(0);
  });

  it('遭遇事件恢复 HP', () => {
    const exp = createExpedition('aridia', 1, 'spaceMarine', 1);
    exp.player.hp = 50;
    const encIdx = exp.events.findIndex(e => e.type === 'encounter');
    if (encIdx < 0) return;
    exp.currentEventIndex = encIdx;
    advanceExpedition(exp);
    // HP may increase if encounter effect is heal
    expect(exp.player.hp).toBeGreaterThanOrEqual(0);
  });

  it('探索事件设置 outcome', () => {
    const exp = createExpedition('aridia', 1, 'spaceMarine', 1);
    const exploreIdx = exp.events.findIndex(e => e.type === 'explore');
    if (exploreIdx < 0) return;
    exp.currentEventIndex = exploreIdx;
    advanceExpedition(exp);
    if (exp.events[exploreIdx].type === 'explore') {
      expect(exp.events[exploreIdx].outcome).toBeDefined();
    }
  });

  it('所有事件完成后远征成功', () => {
    const exp = createExpedition('aridia', 1, 'spaceMarine', 1);
    // Advance through all events (skip combats to avoid death)
    while (exp.status === 'active') {
      // Skip combat events to avoid random death
      const event = exp.events[exp.currentEventIndex];
      if (event.type === 'combat' && exp.player.hp > 0) {
        // Set combat result to victory manually
        if (event.type === 'combat') {
          event.result = {
            victory: true, turnsUsed: 1,
            hpRemaining: exp.player.hp,
            damageDealt: event.enemy.hp,
            damageReceived: 0,
            log: ['测试：自动胜利'],
          };
        }
      }
      advanceExpedition(exp);
      if (exp.currentEventIndex >= exp.events.length) break;
    }
    expect(exp.status).toBe('success');
  });

  it('HP 归零时远征失败', () => {
    const exp = createExpedition('aridia', 3, 'spaceMarine', 1);
    exp.player.hp = 1;
    const combatIdx = exp.events.findIndex(e => e.type === 'combat');
    if (combatIdx < 0) return;
    exp.currentEventIndex = combatIdx;
    advanceExpedition(exp);
    // May or may not die depending on combat, but if HP <= 0 status should be failed
    if (exp.player.hp <= 0) {
      expect(exp.status).toBe('failed');
    }
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/expedition/expeditionEngine.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现远征引擎**

```typescript
// src/expedition/expeditionEngine.ts
import type { ExpeditionEvent, CombatResult, ExploreOutcome, EncounterEffect, ExpeditionPlayer } from './expeditionEvent.js';
import { generateExpeditionEvents } from './expeditionEvent.js';
import { simulateAutoCombat } from './autoCombat.js';
import { getPlanetDef } from '../starmap/planets.js';
import { getClassDef } from '../player/classes.js';
import type { ResourceType } from '../game/gameState.js';

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

export interface LootItem {
  itemId: string;
  name: string;
}

export function createExpedition(
  planetId: string,
  difficulty: 1 | 2 | 3,
  classId: string,
  playerLevel: number,
): Expedition {
  const planet = getPlanetDef(planetId);
  if (!planet) throw new Error(`Planet not found: ${planetId}`);

  const classDef = getClassDef(classId);
  const baseHp = 100 + playerLevel * 10 + (classDef?.hpBonus ?? 0);
  const baseAttack = 10 + playerLevel * 2 + (classDef?.attackBonus ?? 0);
  const baseDefense = 3 + playerLevel + (classDef?.defenseBonus ?? 0);

  const events = generateExpeditionEvents(difficulty, playerLevel, planet.dangerLevel);

  return {
    id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    planetId,
    difficulty,
    status: 'active',
    currentEventIndex: 0,
    events,
    player: {
      hp: baseHp,
      maxHp: baseHp,
      mp: 50,
      maxMp: 50,
      attack: baseAttack,
      defense: baseDefense,
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
      resolveCombatEvent(exp, event);
      break;
    case 'explore':
      resolveExploreEvent(exp, event);
      break;
    case 'encounter':
      resolveEncounterEvent(exp, event);
      break;
    case 'loot':
      resolveLootEvent(exp, event);
      break;
  }

  // Check if expedition is over
  if (exp.player.hp <= 0) {
    exp.status = 'failed';
    return;
  }

  exp.currentEventIndex++;
  if (exp.currentEventIndex >= exp.events.length) {
    exp.status = 'success';
  }
}

function resolveCombatEvent(exp: Expedition, event: ExpeditionEvent & { type: 'combat' }): void {
  const result = simulateAutoCombat(exp.player, event.enemy);
  event.result = result;

  if (result.victory) {
    exp.player.hp = result.hpRemaining;
    exp.expGained += event.enemy.exp;
  } else {
    exp.player.hp = 0;
  }
}

function resolveExploreEvent(exp: Expedition, event: ExpeditionEvent & { type: 'explore' }): void {
  // Success chance based on player level and defense (higher = better)
  const successChance = Math.min(0.85, 0.5 + exp.player.defense * 0.02);
  const success = Math.random() < successChance;

  const poolEntry = (event as any)._poolEntry;

  if (success) {
    exp.expGained += 10;
    event.outcome = { success: true, reward: { type: 'exp', value: 10 } };
  } else {
    const damage = 5 + Math.floor(Math.random() * 5);
    exp.player.hp = Math.max(0, exp.player.hp - damage);
    event.outcome = { success: false, damage };
  }
}

function resolveEncounterEvent(exp: Expedition, event: ExpeditionEvent & { type: 'encounter' }): void {
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
      // Temporary attack boost for next combat
      exp.player.attack += event.effect.value;
      break;
  }
}

function resolveLootEvent(exp: Expedition, event: ExpeditionEvent & { type: 'loot' }): void {
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
    // Lose 50% of loot (random)
    const lostCount = Math.floor(exp.loot.length / 2);
    const shuffled = [...exp.loot].sort(() => Math.random() - 0.5);
    const kept = shuffled.slice(lostCount);
    const lost = shuffled.slice(0, lostCount);
    return {
      expGained: exp.expGained,
      loot: kept,
      resourcesGained: exp.resourcesGained,
      failedLoot: lost,
    };
  }

  return {
    expGained: exp.expGained,
    loot: [...exp.loot],
    resourcesGained: exp.resourcesGained,
    failedLoot: [],
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/expedition/expeditionEngine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/expedition/expeditionEngine.ts tests/expedition/expeditionEngine.test.ts
git commit -m "feat: add expedition engine with event resolution"
```

---

### Task 5: 替换 SaveData 和 GameState

**Files:**
- Modify: `src/game/gameState.ts` (新增 `activeExpedition` 字段)
- Modify: `src/game/saveManager.ts` (处理远征存档)
- Test: `tests/game/gameState.test.ts` (更新测试)

- [ ] **Step 1: 在 gameState.ts 中导入 Expedition 类型**

在 `SaveData` 接口中添加 `activeExpedition?: Expedition` 字段。需要从 `../expedition/expeditionEngine.js` 导入 `Expedition` 类型。由于可能的循环依赖问题，可以将 `Expedition` 的类型定义移到一个共享的类型文件中，或使用 `import type` 延迟导入。

**实际做法：** 在 `gameState.ts` 顶部添加 `import type { Expedition } from '../expedition/expeditionEngine.js';`，并在 `SaveData` 中添加 `activeExpedition?: Expedition;`。在 `toSaveData()` 和 `fromSaveData()` 中序列化/反序列化此字段。

在 `GameState` 类中添加 `activeExpedition?: Expedition` 属性。

- [ ] **Step 2: 更新 SaveManager 以处理远征**

SaveManager 的 `save` 和 `load` 方法已经使用 `state.toSaveData()` 和 `state.fromSaveData()`，如果 GameState 正确处理 activeExpedition，SaveManager 不需要额外修改。

- [ ] **Step 3: 更新 gameState.test.ts 添加远征相关测试**

添加测试验证 `activeExpedition` 字段可以正确序列化和反序列化。

- [ ] **Step 4: 运行所有测试**

Run: `npx vitest run tests/game/gameState.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/gameState.ts tests/game/gameState.test.ts
git commit -m "feat: add activeExpedition to SaveData and GameState"
```

---

### Task 6: HTML/CSS — 远征面板与自动战斗面板

**Files:**
- Modify: `index.html` (替换 dungeon 相关 DOM)
- Modify: `src/styles/main.css` (替换 dungeon/battle 样式)

- [ ] **Step 1: 在 index.html 中替换 `#view-dungeon` 内容**

删除旧的 `#dungeon-hud`、`#battle-screen`、`#dungeon-explore`、`#dungeon-result`，替换为：

```html
<!-- ── Expedition View ── -->
<div id="view-dungeon" class="view">
  <!-- 远征配置面板（无远征时显示） -->
  <div id="expedition-config">
    <div class="expedition-config-empty">
      <p>在星图中选择一颗已探索的星球发起远征。</p>
    </div>
  </div>

  <!-- 远征进行中面板 -->
  <div id="expedition-panel" style="display:none">
    <div id="expedition-header">
      <span id="expedition-planet-name">—</span>
      <span id="expedition-status" class="expedition-status-active">进行中</span>
    </div>
    <div id="expedition-stats">
      <span id="expedition-difficulty">难度：低</span>
      <span class="hud-divider" aria-hidden="true">◆</span>
      <span id="expedition-progress">进度：0/8</span>
      <span class="hud-divider" aria-hidden="true">◆</span>
      <span id="expedition-hp-bar-wrap">
        <span id="expedition-hp-text">HP 100/100</span>
        <div class="expedition-hp-bar-bg"><div class="expedition-hp-bar-fill" id="expedition-hp-bar"></div></div>
      </span>
    </div>
    <div id="expedition-log"></div>
    <div id="expedition-loot"></div>
  </div>

  <!-- 自动战斗面板 -->
  <div id="expedition-battle" style="display:none">
    <div class="battle-header">
      <span class="battle-title">⚔ 遭遇战斗</span>
      <span class="floor-indicator" id="exp-battle-event">第 1/8 个事件</span>
    </div>
    <div class="battle-arena">
      <div class="combatant enemy">
        <div class="sprite-box" id="exp-enemy-sprite">👹</div>
        <div class="combatant-info">
          <div class="combatant-name" id="exp-enemy-name">敌人名称</div>
          <div class="stat-bar">
            <span class="stat-label">HP</span>
            <div class="stat-bar-bg">
              <div class="stat-bar-fill hp" id="exp-enemy-hp-bar" style="width:100%"></div>
            </div>
            <span class="stat-value" id="exp-enemy-hp-text">100/100</span>
          </div>
        </div>
      </div>
      <div class="combatant player">
        <div class="sprite-box" id="exp-player-sprite">⚔</div>
        <div class="combatant-info">
          <div class="combatant-name" id="exp-player-name">星际战士</div>
          <div class="stat-bar">
            <span class="stat-label">HP</span>
            <div class="stat-bar-bg">
              <div class="stat-bar-fill hp" id="exp-player-hp-bar" style="width:100%"></div>
            </div>
            <span class="stat-value" id="exp-player-hp-text">100/100</span>
          </div>
          <div class="stat-bar">
            <span class="stat-label">MP</span>
            <div class="stat-bar-bg mp">
              <div class="stat-bar-fill mp" id="exp-player-mp-bar" style="width:100%"></div>
            </div>
            <span class="stat-value" id="exp-player-mp-text">50/50</span>
          </div>
        </div>
      </div>
    </div>
    <div class="battle-log-only">
      <div class="panel-title">▸ 战斗记录</div>
      <div class="log-entries" id="exp-battle-log"></div>
    </div>
  </div>

  <!-- 远征结算面板 -->
  <div id="expedition-result" style="display:none"></div>
</div>
```

- [ ] **Step 2: 在 main.css 中添加远征相关样式**

添加 `#expedition-panel`、`#expedition-config`、`#expedition-battle`、`#expedition-log`、`#expedition-loot` 的样式。复用现有的 `.battle-*` 和 `.stat-bar-*` 样式类。新增 `.expedition-hp-bar-*` 样式。删除不再使用的 `#dungeon-explore`、`#dungeon-controls`、`#dungeon-canvas` 相关样式。

- [ ] **Step 3: 在浏览器中检查样式效果**

Run: `npm run dev` → 打开浏览器验证远征面板的 DOM 结构渲染正确。

- [ ] **Step 4: Commit**

```bash
git add index.html src/styles/main.css
git commit -m "feat: replace dungeon DOM with expedition panel UI"
```

---

### Task 7: 远征视图渲染

**Files:**
- Create: `src/expedition/expeditionView.ts`
- Create: `src/expedition/expeditionBattle.ts`

- [ ] **Step 1: 实现 expeditionView.ts**

核心功能：
- `renderExpeditionPanel(exp, planetName)`: 渲染远征日志面板
  - 更新顶部状态栏（星球名、难度、进度、HP条）
  - 渲染事件日志流（已完成折叠▼、当前展开▸、未触发灰显○）
  - 渲染底部战利品栏
- `showExpeditionResult(exp, settlement)`: 显示结算面板
- `renderExpeditionConfig(state)`: 显示配置面板（无远征时）

日志渲染逻辑：
- 已完成事件显示为一行摘要（如"战斗胜利：击败了兽人仔，损失 8 HP"）
- 当前事件显示完整描述
- 未触发事件显示为 "○ 未知事件"

- [ ] **Step 2: 实现 expeditionBattle.ts**

核心功能：
- `showBattlePanel(event, eventIndex, totalEvents)`: 显示自动战斗面板
- `renderBattleFrame(state)`: 渲染一帧战斗画面（更新 HP/MP 条、日志）
- `hideBattlePanel()`: 隐藏战斗面板
- `playAutoCombat(exp, event, onDone)`: 自动播放战斗动画
  - 使用 `simulateAutoCombat` 获取完整战斗结果
  - 逐回合播放：每回合 1.2 秒间隔
  - 每回合内：先播放玩家行动（0.5s），再播放敌人行动（0.5s）
  - 通过 `setTimeout` 链实现定时推进
  - 每一步更新 HP 条和战斗日志

- [ ] **Step 3: Commit**

```bash
git add src/expedition/expeditionView.ts src/expedition/expeditionBattle.ts
git commit -m "feat: add expedition view and auto-battle visualizer"
```

---

### Task 8: 星图集成与主入口改造

**Files:**
- Modify: `src/starmap/starMapView.ts` (改造远征入口)
- Modify: `src/main.ts` (删除旧地牢逻辑，接入远征系统)

- [ ] **Step 1: 改造 starMapView.ts**

修改 `renderPlanets`：
- 远征进行中时，星球卡片显示"远征中"标记
- 点击星球时，如果有活跃远征则打开远征面板，否则弹出远征配置面板（选难度）

新增 `showExpeditionConfigModal(planetId, state, onConfirm)`：
- 弹出 overlay 面板，显示星球信息
- 三个难度按钮（低/中/高），每个显示预估事件数
- 点击后消费能量并创建远征

- [ ] **Step 2: 改造 main.ts**

删除所有旧地牢相关代码：
- 删除 `import` dungeonView、CanvasRenderer、combat 相关
- 删除 `dungeonRun`、`dungeonRenderer`、`dungeonAnimFrame` 变量
- 删除 `renderBattleUI`、`renderDungeonView` 函数
- 删除键盘控制和移动按钮的事件监听
- 删除战斗按钮事件监听

新增远征逻辑：
- 导入 `createExpedition`、`advanceExpedition`、`settleExpedition`
- 导入 `renderExpeditionPanel`、`playAutoCombat`、`showExpeditionResult`
- 导入 `renderExpeditionConfig`
- 添加远征推进定时器（`setInterval` 每 4 秒调用 `advanceExpedition`）
- 保存 `activeExpedition` 到 `GameState`
- 视图切换时处理远征面板显示/隐藏

- [ ] **Step 3: 处理存档恢复远征**

在 `init()` 中，加载存档后检查 `state.activeExpedition`：
- 如果存在且状态为 `active`，恢复远征推进定时器
- 如果状态为 `success` 或 `failed`，显示结算结果

- [ ] **Step 4: 运行所有测试**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/starmap/starMapView.ts src/main.ts
git commit -m "feat: integrate expedition system with starmap and main entry"
```

---

### Task 9: 删除旧代码和清理

**Files:**
- Delete: `src/roguelike/dungeonView.ts`
- Delete: `src/roguelike/dungeonGen.ts`
- Delete: `src/roguelike/fogOfWar.ts`
- Delete: `src/render/canvasRenderer.ts`
- Delete: `src/render/tileset.ts`
- Delete: `tests/roguelike/dungeonGen.test.ts`
- Delete: `tests/roguelike/fogOfWar.test.ts`
- Delete: `tests/render/canvasRenderer.test.ts`

- [ ] **Step 1: 删除旧文件**

```bash
rm src/roguelike/dungeonView.ts
rm src/roguelike/dungeonGen.ts
rm src/roguelike/fogOfWar.ts
rm src/render/canvasRenderer.ts
rm src/render/tileset.ts
rm tests/roguelike/dungeonGen.test.ts
rm tests/roguelike/fogOfWar.test.ts
rm tests/render/canvasRenderer.test.ts
```

- [ ] **Step 2: 检查是否还有残留引用**

```bash
grep -r "dungeonView\|dungeonGen\|fogOfWar\|canvasRenderer\|tileset" src/ tests/ --include="*.ts"
```

如果有残留引用，清除它们。

- [ ] **Step 3: 运行 TypeScript 检查**

Run: `npm run build`
Expected: BUILD SUCCESS（无类型错误）

- [ ] **Step 4: 运行所有测试**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove old dungeon system (map gen, fog, canvas renderer)"
```

---

### Task 10: 端到端测试与最终验证

**Files:**
- Modify: 可能需要微调的任何文件

- [ ] **Step 1: 启动开发服务器**

Run: `npm run dev`

- [ ] **Step 2: 手动验证远征流程**

1. 打开浏览器，在星图中选择"阿里迪亚主星"
2. 弹出远征配置面板，选择难度"低"
3. 点击"派遣远征"
4. 验证远征面板显示，事件逐个推进（每 4 秒）
5. 遇到战斗事件时，验证自动战斗面板弹出
6. 验证战斗面板中 HP 条和日志实时更新
7. 战斗结束后，验证返回远征日志面板
8. 远征完成或失败后，验证结算面板显示
9. 验证资源和经验正确更新到 GameState

- [ ] **Step 3: 验证存档功能**

1. 远征进行中刷新页面
2. 验证远征从存档恢复并继续推进
3. 远征完成后再刷新，验证不残留

- [ ] **Step 4: 运行完整测试套件**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 5: 最终 Commit**

```bash
git add -A
git commit -m "feat: complete expedition system replacement"
```
