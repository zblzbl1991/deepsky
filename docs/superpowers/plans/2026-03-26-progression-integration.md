# 进度感整合 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect idle base building, star map exploration, and expedition systems through level-up, planet first-time rewards, auto-return to starmap, and tech tree effects.

**Architecture:** Four independent modules: (1) level-up system in `gameState.ts` + `expeditionEngine.ts`, (2) first-reward data in `planets.json` + `main.ts`, (3) auto-return timer in `main.ts`, (4) tech effect functions in new `techEffects.ts` consumed by `gameLoop.ts`, `expeditionEngine.ts`, and `main.ts`.

**Tech Stack:** TypeScript, Vite, Vitest, DOM-based UI

**Spec:** `docs/superpowers/specs/2026-03-26-progression-integration-design.md`

---

### Task 1: Level-Up System — `levelUpExp()` and `getMilestoneBonuses()`

**Files:**
- Create: `tests/player/levelUp.test.ts`
- Modify: `src/player/classes.ts` (add exported functions)
- Test: `tests/player/levelUp.test.ts`

- [ ] **Step 1: Write failing tests for `levelUpExp()` and `getMilestoneBonuses()`**

```typescript
// tests/player/levelUp.test.ts
import { describe, it, expect } from 'vitest';
import { levelUpExp, getMilestoneBonuses } from '../../src/player/classes.js';

describe('levelUpExp', () => {
  it('level 1 needs 100 exp', () => {
    expect(levelUpExp(1)).toBe(100);
  });
  it('level 2 needs 283 exp', () => {
    expect(levelUpExp(2)).toBe(283);
  });
  it('level 10 needs 3162 exp', () => {
    expect(levelUpExp(10)).toBe(3162);
  });
  it('returns integer (floored)', () => {
    expect(Number.isInteger(levelUpExp(3))).toBe(true);
  });
});

describe('getMilestoneBonuses', () => {
  it('level 4 has no bonuses', () => {
    const b = getMilestoneBonuses(4);
    expect(b.productionMultiplier).toBe(1.0);
    expect(b.expeditionHpBonus).toBe(0);
    expect(b.extraBuildingSlots).toBe(0);
  });
  it('level 5 gives production x1.10', () => {
    const b = getMilestoneBonuses(5);
    expect(b.productionMultiplier).toBeCloseTo(1.10);
  });
  it('level 10 gives expedition HP +20', () => {
    const b = getMilestoneBonuses(10);
    expect(b.expeditionHpBonus).toBe(20);
    expect(b.productionMultiplier).toBeCloseTo(1.10);
  });
  it('level 15 gives extra building slot', () => {
    const b = getMilestoneBonuses(15);
    expect(b.extraBuildingSlots).toBe(1);
  });
  it('level 20 gives production x1.265 cumulative', () => {
    const b = getMilestoneBonuses(20);
    expect(b.productionMultiplier).toBeCloseTo(1.265);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/player/levelUp.test.ts`
Expected: FAIL — `levelUpExp` and `getMilestoneBonuses` not exported from `classes.js`

- [ ] **Step 3: Implement `levelUpExp()` and `getMilestoneBonuses()` in `src/player/classes.ts`**

Add at the bottom of `src/player/classes.ts`:

```typescript
export interface MilestoneBonuses {
  productionMultiplier: number;
  expeditionHpBonus: number;
  extraBuildingSlots: number;
}

export function levelUpExp(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

export function getMilestoneBonuses(level: number): MilestoneBonuses {
  let productionMultiplier = 1.0;
  let expeditionHpBonus = 0;
  let extraBuildingSlots = 0;

  if (level >= 5) productionMultiplier *= 1.10;
  if (level >= 10) expeditionHpBonus = 20;
  if (level >= 15) extraBuildingSlots = 1;
  if (level >= 20) productionMultiplier *= 1.15;

  return { productionMultiplier, expeditionHpBonus, extraBuildingSlots };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/player/levelUp.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/player/classes.ts tests/player/levelUp.test.ts
git commit -m "feat: add levelUpExp formula and milestone bonus system"
```

---

### Task 2: Level-Up System — `GameState.addExp()` with multi-level cascading

**Files:**
- Modify: `tests/game/gameState.test.ts`
- Modify: `src/game/gameState.ts`

- [ ] **Step 1: Write failing tests for `addExp()`**

Add to `tests/game/gameState.test.ts` inside the `describe('GameState')` block:

```typescript
it('addExp increases player exp', () => {
  const state = createGameState();
  state.addExp(50);
  expect(state.player.exp).toBe(50);
});

it('addExp levels up when threshold reached', () => {
  const state = createGameState();
  const gained = state.addExp(100);
  expect(gained).toBe(1);
  expect(state.player.level).toBe(2);
  expect(state.player.exp).toBe(0);
});

it('addExp carries over excess exp', () => {
  const state = createGameState();
  const gained = state.addExp(150);
  expect(gained).toBe(1);
  expect(state.player.level).toBe(2);
  expect(state.player.exp).toBe(50);
});

it('addExp handles multi-level cascade', () => {
  const state = createGameState();
  // Level 1→2 needs 100, level 2→3 needs 283. Total 383 for 2 levels.
  const gained = state.addExp(400);
  expect(gained).toBe(2);
  expect(state.player.level).toBe(3);
  expect(state.player.exp).toBeCloseTo(17, 0);
});

it('addExp returns 0 when no level up', () => {
  const state = createGameState();
  const gained = state.addExp(50);
  expect(gained).toBe(0);
  expect(state.player.level).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/game/gameState.test.ts`
Expected: FAIL — `state.addExp is not a function`

- [ ] **Step 3: Implement `addExp()` in `src/game/gameState.ts`**

Add imports at top of `src/game/gameState.ts`:

```typescript
import { levelUpExp, getMilestoneBonuses } from '../player/classes.js';
import { eventBus } from './eventBus.js';
```

Add method to `GameState` class (after `spendResources`):

```typescript
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
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/gameState.ts tests/game/gameState.test.ts
git commit -m "feat: add addExp with multi-level cascade and levelUp event"
```

---

### Task 3: Level-Up System — `getPlayerStats()` replacing hardcoded stats

**Files:**
- Modify: `tests/expedition/expeditionEngine.test.ts`
- Create: `src/tech/techEffects.ts` (stub)
- Modify: `src/expedition/expeditionEngine.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Write failing tests for `getPlayerStats()`**

Add to `tests/expedition/expeditionEngine.test.ts`:

```typescript
import { getPlayerStats } from '../../src/expedition/expeditionEngine.js';

describe('getPlayerStats', () => {
  it('base stats at level 1 spaceMarine', () => {
    const stats = getPlayerStats(1, 'spaceMarine', []);
    // spaceMarine: hpBonus=20, attackBonus=3, defenseBonus=2
    // maxHp = 100 + 1*10 + 20 = 130
    expect(stats.maxHp).toBe(130);
    // maxMp = 50 + 1*5 = 55
    expect(stats.maxMp).toBe(55);
    // attack = 10 + 1*2 + 3 = 15
    expect(stats.attack).toBe(15);
    // defense = 3 + 1 + 2 = 6
    expect(stats.defense).toBe(6);
  });

  it('level 5 has more stats than level 1', () => {
    const s1 = getPlayerStats(1, 'spaceMarine', []);
    const s5 = getPlayerStats(5, 'spaceMarine', []);
    expect(s5.maxHp).toBeGreaterThan(s1.maxHp);
    expect(s5.attack).toBeGreaterThan(s1.attack);
  });

  it('tech combat bonus adds flat stats', () => {
    const without = getPlayerStats(1, 'spaceMarine', []);
    const withTech = getPlayerStats(1, 'spaceMarine', ['xenoAnalysis', 'voidShielding']);
    expect(withTech.attack).toBe(without.attack + 5);
    expect(withTech.defense).toBe(without.defense + 5);
  });

  it('milestone HP bonus at level 10', () => {
    const stats = getPlayerStats(10, 'spaceMarine', []);
    // 100 + 10*10 + 20 (class) + 20 (milestone) = 240
    expect(stats.maxHp).toBe(240);
  });

  it('unknown classId falls back to 0 bonuses', () => {
    const stats = getPlayerStats(1, 'nonexistent', []);
    expect(stats.maxHp).toBe(110);  // 100 + 10 + 0
    expect(stats.attack).toBe(12);  // 10 + 2 + 0
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/expedition/expeditionEngine.test.ts`
Expected: FAIL — `getPlayerStats` not exported

- [ ] **Step 3: Create stub `src/tech/techEffects.ts`**

```typescript
// src/tech/techEffects.ts — stub, will be replaced in Task 5
export function getTechCombatBonus(_techUnlocked: string[]): { attack: number; defense: number } {
  return { attack: 0, defense: 0 };
}
```

- [ ] **Step 4: Add `getPlayerStats()` to `src/expedition/expeditionEngine.ts`**

Add imports at top (merge with existing imports from `classes.js`):

```typescript
import { getMilestoneBonuses, type MilestoneBonuses } from '../player/classes.js';
import { getTechCombatBonus } from '../tech/techEffects.js';
```

Add exported function (before `createExpedition`):

```typescript
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
```

- [ ] **Step 5: Update `createExpedition` to use `getPlayerStats`**

Add `techUnlocked` parameter with default:

```typescript
export function createExpedition(
  planetId: string,
  difficulty: 1 | 2 | 3,
  classId: string,
  playerLevel: number,
  techUnlocked: string[] = [],
): Expedition {
```

Replace lines 36-39 (hardcoded stats) with:

```typescript
  const stats = getPlayerStats(playerLevel, classId, techUnlocked);
```

Replace lines 50-54 (player object) with:

```typescript
    player: {
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      mp: stats.maxMp,
      maxMp: stats.maxMp,
      attack: stats.attack,
      defense: stats.defense,
      classId,
    },
```

- [ ] **Step 6: Update call site in `src/main.ts:93`**

```typescript
const exp = createExpedition(planetId, difficulty, state.player.class, state.player.level, state.techUnlocked);
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run tests/expedition/expeditionEngine.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/expedition/expeditionEngine.ts src/tech/techEffects.ts src/main.ts tests/expedition/expeditionEngine.test.ts
git commit -m "feat: add getPlayerStats with class, level, tech, milestone scaling"
```

---

### Task 4: Level-Up System — level-up notification in idleView

**Files:**
- Modify: `src/idle/idleView.ts`
- Modify: `src/main.ts`
- Modify: `src/styles/main.css`

- [ ] **Step 1: Add level-up event listener to `idleView.ts`**

Add import:

```typescript
import { eventBus } from '../game/eventBus.js';
```

Add exported function:

```typescript
export function initLevelUpListener(): void {
  eventBus.on('levelUp', (...args: unknown[]) => {
    const newLevel = args[0] as number;
    const milestone = args[1] as { productionMultiplier: number; expeditionHpBonus: number; extraBuildingSlots: number };
    const toast = document.createElement('div');
    toast.className = 'level-up-toast';
    let msg = `等级提升至 ${newLevel} 级！`;
    if (milestone.productionMultiplier > 1.0) msg += ' 产量提升！';
    if (milestone.expeditionHpBonus > 0) msg += ' 远征HP提升！';
    if (milestone.extraBuildingSlots > 0) msg += ' 解锁新建筑槽位！';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  });
}
```

- [ ] **Step 2: Wire `initLevelUpListener()` into `init()` in `src/main.ts`**

```typescript
import { renderIdleView, renderResources, initLevelUpListener } from './idle/idleView.js';
// In init(), before gameLoop.start():
initLevelUpListener();
```

- [ ] **Step 3: Add CSS for the toast notification to `src/styles/main.css`**

```css
.level-up-toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--surface-5, #f0f0f0);
  color: var(--gold, #c8a832);
  padding: 12px 24px;
  border-radius: 8px;
  font-size: var(--text-lg, 18px);
  font-weight: bold;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  animation: toastIn 0.3s ease-out;
}
@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/idle/idleView.ts src/main.ts src/styles/main.css
git commit -m "feat: add level-up toast notification in idle view"
```

---

### Task 5: Tech Effects — `techEffects.ts` module (replace stub)

**Files:**
- Create: `tests/tech/techEffects.test.ts`
- Modify: `src/tech/techEffects.ts` (replace stub from Task 3)

- [ ] **Step 1: Write failing tests**

```typescript
// tests/tech/techEffects.test.ts
import { describe, it, expect } from 'vitest';
import { getBuildingProductionBonus, getTechCombatBonus, getEnergyDiscount } from '../../src/tech/techEffects.js';

describe('getBuildingProductionBonus', () => {
  it('no techs returns 0', () => {
    expect(getBuildingProductionBonus('mine', [])).toBe(0);
  });
  it('improvedMining gives mine +0.5', () => {
    expect(getBuildingProductionBonus('mine', ['improvedMining'])).toBeCloseTo(0.5);
  });
  it('wrong building returns 0', () => {
    expect(getBuildingProductionBonus('powerPlant', ['improvedMining'])).toBe(0);
  });
  it('plasmaEfficiency gives powerPlant +0.5', () => {
    expect(getBuildingProductionBonus('powerPlant', ['plasmaEfficiency'])).toBeCloseTo(0.5);
  });
  it('two different techs for same building stack', () => {
    // If a second tech also boosted mine, they would stack additively
    expect(getBuildingProductionBonus('mine', ['improvedMining', 'improvedMining'])).toBeCloseTo(1.0);
  });
});

describe('getTechCombatBonus', () => {
  it('no techs returns 0,0', () => {
    const b = getTechCombatBonus([]);
    expect(b.attack).toBe(0);
    expect(b.defense).toBe(0);
  });
  it('xenoAnalysis gives +5 attack', () => {
    const b = getTechCombatBonus(['xenoAnalysis']);
    expect(b.attack).toBe(5);
    expect(b.defense).toBe(0);
  });
  it('voidShielding gives +5 defense', () => {
    const b = getTechCombatBonus(['voidShielding']);
    expect(b.attack).toBe(0);
    expect(b.defense).toBe(5);
  });
  it('both stack', () => {
    const b = getTechCombatBonus(['xenoAnalysis', 'voidShielding']);
    expect(b.attack).toBe(5);
    expect(b.defense).toBe(5);
  });
});

describe('getEnergyDiscount', () => {
  it('no techs returns 0', () => {
    expect(getEnergyDiscount([])).toBe(0);
  });
  it('warpDrive gives 0.25 discount', () => {
    expect(getEnergyDiscount(['warpDrive'])).toBeCloseTo(0.25);
  });
  it('caps at 0.75', () => {
    expect(getEnergyDiscount(['warpDrive', 'warpDrive', 'warpDrive', 'warpDrive'])).toBeCloseTo(0.75);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tech/techEffects.test.ts`
Expected: Some tests fail (stub from Task 3 returns 0 for all)

- [ ] **Step 3: Replace stub in `src/tech/techEffects.ts` with full implementation**

```typescript
import { getTechDef } from './techTree.js';

export function getBuildingProductionBonus(buildingId: string, techUnlocked: string[]): number {
  let bonus = 0;
  for (const techId of techUnlocked) {
    const def = getTechDef(techId);
    if (def?.effect?.buildingBonus?.[buildingId]) {
      bonus += def.effect.buildingBonus[buildingId] as number;
    }
  }
  return bonus;
}

export function getTechCombatBonus(techUnlocked: string[]): { attack: number; defense: number } {
  let attack = 0;
  let defense = 0;
  for (const techId of techUnlocked) {
    const def = getTechDef(techId);
    const cb = def?.effect?.combatBonus as Record<string, number> | undefined;
    if (cb) {
      if (cb.attack) attack += cb.attack;
      if (cb.defense) defense += cb.defense;
    }
  }
  return { attack, defense };
}

export function getEnergyDiscount(techUnlocked: string[]): number {
  let discount = 0;
  for (const techId of techUnlocked) {
    const def = getTechDef(techId);
    if (def?.effect?.energyDiscount) {
      discount += def.effect.energyDiscount as number;
    }
  }
  return Math.min(discount, 0.75);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/tech/techEffects.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/tech/techEffects.ts tests/tech/techEffects.test.ts
git commit -m "feat: implement tech effects from TechDef.effect structures"
```

---

### Task 6: Tech Effects — apply building production bonus in GameLoop

**Files:**
- Modify: `src/game/gameLoop.ts`
- Create: `tests/game/gameLoop.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/game/gameLoop.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createGameState } from '../../src/game/gameState.js';
import { GameLoop } from '../../src/game/gameLoop.js';
import { unlockBuilding } from '../../src/idle/buildings.js';

describe('GameLoop tech production bonus', () => {
  it('mine produces more with improvedMining tech', () => {
    const state = createGameState();
    state.addResource('minerals', 999);
    unlockBuilding(state, 'mine');

    const loop = new GameLoop(state);
    loop.tick(1);
    const base = state.resources.minerals;

    // Reset minerals to same starting point
    state.resources.minerals = 999;

    // Now with tech
    state.techUnlocked.push('improvedMining');
    loop.tick(1);

    expect(state.resources.minerals).toBeGreaterThan(base);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/game/gameLoop.test.ts`
Expected: FAIL (mine produces same amount with/without tech)

- [ ] **Step 3: Modify `GameLoop.tick()` to apply tech building bonus**

In `src/game/gameLoop.ts`, add import:

```typescript
import { getBuildingProductionBonus } from '../tech/techEffects.js';
import { getMilestoneBonuses } from '../player/classes.js';
```

In `tick()`, replace line 45:

```typescript
// Before:
this.state.resources[key as ResourceType] += (val ?? 0) * buildingState.level * deltaSeconds;

// After:
const techBonus = 1 + getBuildingProductionBonus(building.id, this.state.techUnlocked);
const milestoneBonus = getMilestoneBonuses(this.state.player.level).productionMultiplier;
this.state.resources[key as ResourceType] += (val ?? 0) * buildingState.level * techBonus * milestoneBonus * deltaSeconds;
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/gameLoop.ts tests/game/gameLoop.test.ts
git commit -m "feat: apply tech and milestone production bonuses in GameLoop"
```

---

### Task 7: Tech Effects — update production rate display in idleView

**Files:**
- Modify: `src/idle/idleView.ts`

- [ ] **Step 1: Update `renderResources()` to show bonus-inclusive rate**

In `src/idle/idleView.ts`, add import:

```typescript
import { getBuildingProductionBonus } from '../tech/techEffects.js';
import { getMilestoneBonuses } from '../player/classes.js';
```

In `renderResources()`, replace the rate calculation (lines 50-58):

```typescript
// Before:
let rate = 0;
const buildings = getBuildings();
for (const b of buildings) {
  const bs = state.buildings[b.id];
  if (!bs?.unlocked) continue;
  if (b.produces[key]) {
    rate += (b.produces[key] ?? 0) * bs.level;
  }
}

// After:
let rate = 0;
const buildings = getBuildings();
const milestoneBonus = getMilestoneBonuses(state.player.level).productionMultiplier;
for (const b of buildings) {
  const bs = state.buildings[b.id];
  if (!bs?.unlocked) continue;
  if (b.produces[key]) {
    const techBonus = 1 + getBuildingProductionBonus(b.id, state.techUnlocked);
    rate += (b.produces[key] ?? 0) * bs.level * techBonus * milestoneBonus;
  }
}
```

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add src/idle/idleView.ts
git commit -m "feat: display bonus-inclusive production rate in idle view"
```

---

### Task 8: Planet First-Time Reward — data and type changes

**Files:**
- Modify: `src/data/planets.json`
- Modify: `src/starmap/planets.ts`

- [ ] **Step 1: Add `firstReward` to each planet in `src/data/planets.json`**

Add `"firstReward"` field to each planet object (3× the existing `rewards` + themed item):

| Planet | resources | itemId | itemName |
|--------|-----------|--------|----------|
| aridia | minerals: 1500, tech: 60 | aridiaDataCore | 阿里迪亚数据核心 |
| hiveTartarus | tech: 600, alloys: 150 | hiveCensusData | 蜂巢人口普查数据 |
| carnagedd | relics: 6, tech: 300 | tyranidChitin | 泰伦甲壳样本 |
| warpRift | relics: 15, alloys: 600 | warpShard | 亚空间裂隙碎片 |
| forgeMars | alloys: 900, tech: 900 | stcFragment | STC碎片 |

Example for aridia:

```json
"firstReward": {
  "resources": { "minerals": 1500, "tech": 60 },
  "itemId": "aridiaDataCore",
  "itemName": "阿里迪亚数据核心"
}
```

- [ ] **Step 2: Update `PlanetDef` interface in `src/starmap/planets.ts`**

Add before `PlanetDef`:

```typescript
export interface FirstReward {
  resources: Record<string, number>;
  itemId: string;
  itemName: string;
}
```

Add to `PlanetDef`:

```typescript
  firstReward?: FirstReward;
```

- [ ] **Step 3: Run existing planet tests**

Run: `npx vitest run tests/starmap/planets.test.ts`
Expected: PASS (new optional field is backward-compatible)

- [ ] **Step 4: Commit**

```bash
git add src/data/planets.json src/starmap/planets.ts
git commit -m "feat: add firstReward data for all 5 planets"
```

---

### Task 9: Planet First-Time Reward + Auto-Return — rewrite `finishExpedition()`

**Files:**
- Modify: `src/main.ts`
- Modify: `src/expedition/expeditionView.ts`

> This task combines first-reward logic and auto-return into a single `finishExpedition()` rewrite, since both modify the same function.

- [ ] **Step 1: Extract `returnToStarmap()` helper in `src/main.ts`**

```typescript
function returnToStarmap(state: GameState): void {
  const ui = createUIManager();
  ui.showView('starmap');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-view="starmap"]')!.classList.add('active');
  document.getElementById('view-title')!.textContent = '星图';
  renderStarMapView(state, (planetId) => {
    showExpeditionConfigModal(planetId, state, (pid, difficulty) => {
      startExpedition(pid, difficulty);
    });
  });
}
```

- [ ] **Step 2: Rewrite `finishExpedition()` with first-reward + addExp + auto-return**

```typescript
function finishExpedition(state: GameState): void {
  const exp = state.activeExpedition;
  if (!exp) return;

  const settlement = settleExpedition(exp);

  // First-time planet reward
  let isFirstVisit = false;
  if (exp.status === 'success' && !state.exploredPlanets.includes(exp.planetId)) {
    const planet = getPlanetDef(exp.planetId);
    if (planet?.firstReward) {
      isFirstVisit = true;
      const fr = planet.firstReward;
      for (const [type, amount] of Object.entries(fr.resources)) {
        const resType = type as 'minerals' | 'energy' | 'tech' | 'alloys' | 'relics';
        settlement.resourcesGained[resType] = (settlement.resourcesGained[resType] || 0) + amount;
      }
      settlement.loot.push({ itemId: fr.itemId, name: fr.itemName });
      state.exploredPlanets.push(exp.planetId);
    }
  }

  // Apply exp (with addExp for level-up)
  state.addExp(settlement.expGained);

  // Apply resources
  for (const [type, amount] of Object.entries(settlement.resourcesGained)) {
    if (amount && amount > 0) {
      state.addResource(type as 'minerals' | 'energy' | 'tech' | 'alloys' | 'relics', amount);
    }
  }

  // Apply equipment
  for (const item of settlement.loot) {
    state.player.equipment.push(item.itemId);
  }

  showExpeditionResult(exp, settlement, isFirstVisit);
  state.activeExpedition = undefined;

  // Auto-return to starmap after 3 seconds
  const autoReturnTimer = setTimeout(() => returnToStarmap(state), 3000);

  document.getElementById('expedition-result')!.addEventListener('click', () => {
    clearTimeout(autoReturnTimer);
    returnToStarmap(state);
  }, { once: true });
}
```

- [ ] **Step 3: Update `showExpeditionResult` in `src/expedition/expeditionView.ts`**

Change signature to accept `isFirstVisit`:

```typescript
export function showExpeditionResult(
  exp: Expedition,
  settlement: { expGained: number; loot: LootItem[]; resourcesGained: Partial<Record<ResourceType, number>>; failedLoot: LootItem[] },
  isFirstVisit = false,
): void {
```

Add first-visit badge into the `resultEl.innerHTML` template:

```typescript
const firstVisitHtml = isFirstVisit ? '<p style="color:var(--gold,#c8a832);font-weight:bold">★ 首次探索奖励！</p>' : '';
```

Insert `firstVisitHtml` after `<h2>${title}</h2>` in the template.

Also change the hint text:

```typescript
// Before:
`<p style="font-size:var(--text-xs);color:var(--text-dim);margin-top:var(--space-4)">返回星图选择新的目标星球。</p>`

// After:
`<p style="font-size:var(--text-xs);color:var(--text-dim);margin-top:var(--space-4)">点击返回星图，或等待 3 秒自动返回。</p>`
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/expedition/expeditionView.ts
git commit -m "feat: add first-time planet reward and auto-return to starmap"
```

---

### Task 10: Energy Discount in `startExpedition()` and Star Map Display

**Files:**
- Modify: `src/main.ts`
- Modify: `src/starmap/starMapView.ts`

- [ ] **Step 1: Apply energy discount in `startExpedition()`**

In `src/main.ts`, add import:

```typescript
import { getEnergyDiscount } from './tech/techEffects.js';
```

Update the energy cost check in `startExpedition()`:

```typescript
// Before:
if (state.resources.energy < planet.energyCost) return;
state.spendResource('energy', planet.energyCost);

// After:
const discount = getEnergyDiscount(state.techUnlocked);
const actualCost = Math.round(planet.energyCost * (1 - discount));
if (state.resources.energy < actualCost) return;
state.spendResource('energy', actualCost);
```

- [ ] **Step 2: Display discounted energy cost in star map**

In `src/starmap/starMapView.ts`, add import:

```typescript
import { getEnergyDiscount } from '../tech/techEffects.js';
```

In `renderPlanets()`, update energy display and affordability check:

```typescript
const discount = getEnergyDiscount(state.techUnlocked);
const actualCost = Math.round(planet.energyCost * (1 - discount));
const canAffordEnergy = state.resources.energy >= actualCost;
const costDisplay = discount > 0
  ? `<s style="color:var(--text-dim)">${formatNumber(planet.energyCost)}</s> ${formatNumber(actualCost)}`
  : formatNumber(planet.energyCost);
```

Use `costDisplay` in the template instead of `formatNumber(planet.energyCost)`.

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add src/main.ts src/starmap/starMapView.ts
git commit -m "feat: apply tech energy discount in expedition and star map"
```

---

### Task 11: Save-Load Resume — use `finishExpedition()` for completed expeditions

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Replace the save-resume settlement block with `finishExpedition()` call**

In `init()`, replace the existing save-resume block (lines 266-277) that handles completed/failed expeditions. Instead of manually settling and applying rewards, call `finishExpedition(state)` which now handles everything (first-reward, addExp, auto-return):

```typescript
// Before:
} else if (state.activeExpedition) {
    const settlement = settleExpedition(state.activeExpedition);
    showExpeditionResult(state.activeExpedition, settlement);
    state.player.exp += settlement.expGained;
    for (const [type, amount] of Object.entries(settlement.resourcesGained)) {
      if (amount && amount > 0) {
        state.addResource(type as 'minerals' | 'energy' | 'tech' | 'alloys' | 'relics', amount);
      }
    }
    state.activeExpedition = undefined;
  }

// After:
} else if (state.activeExpedition) {
    finishExpedition(state);
  }
```

This ensures the save-resume path also checks first-reward, uses `addExp()` for level-up, and triggers auto-return — all in one call.

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: use finishExpedition for save-resume to ensure full logic"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds
