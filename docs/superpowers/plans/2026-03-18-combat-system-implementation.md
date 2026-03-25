# 远征战斗系统实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现完整的宝可梦风格回合制战斗系统，包含 Canvas 修复、帝国军械库风格 UI、MP + 冷却技能系统

**Architecture:** 新增 `skills.ts` 技能定义模块，扩展 `combat.ts` 支持技能效果/MP/冷却/buff，扩展 `DungeonRun` 接口，更新 `index.html` 和 `main.css` 实现方案B战斗布局，集成到 `main.ts` 主循环

**Tech Stack:** TypeScript, Canvas 2D, HTML/CSS, Vitest

---

## 文件变更总览

| 文件 | 变更类型 | 职责 |
|------|----------|------|
| `src/roguelike/skills.ts` | 新增 | 技能定义（SkillDef, SkillEffect, CLASS_SKILLS, getSkillsForClass） |
| `src/roguelike/combat.ts` | 修改 | CombatState 新增 MP/冷却/buff；新增 useSkill/endTurn；修改 executeCombatRound 处理 buff |
| `src/roguelike/dungeonView.ts` | 修改 | DungeonRun 新增 MP/冷却/buff 字段；新增 useSkillById；更新 startCombat/startDungeonRun |
| `src/main.ts` | 修改 | Canvas 初始化修复；战斗 UI 渲染（renderBattleUI）；技能按钮绑定 |
| `index.html` | 修改 | 方案B战斗界面 DOM（battle-screen, sprite-box, skill buttons, cooldown display） |
| `src/styles/main.css` | 修改 | 方案B战斗界面 CSS（battle-arena, action-btn.skill, stat-bar, combat-log） |
| `tests/roguelike/skills.test.ts` | 新增 | 技能定义和查询的单元测试 |
| `tests/roguelike/combat.test.ts` | 修改 | 修复已有测试（中文 log），新增技能/MP/冷却/buff 测试 |

---

## Task 1: 修复已有战斗测试 + 技能系统核心

**背景:** 现有 `combat.test.ts` 中的测试引用英文 log 消息（"strike", "retaliates", "disengaged", "Failed", "slain"），但 `combat.ts` 实际使用中文消息。这些测试当前会失败。需要先修复，再添加技能模块。

### Step 1.1: 修复已有 combat.test.ts 中的 log 消息断言

**Files:**
- Modify: `tests/roguelike/combat.test.ts:55-115`

- [ ] **修复测试中的中文 log 断言**

将以下测试的英文断言改为中文：

```typescript
// Line 55: "strike" → 改为检查中文 "造成"
it('player attack adds message to combat log', () => {
  const combat = createCombatState(100, 10, 5, dummyEnemy);
  executeCombatRound(combat, 'attack');
  expect(combat.log.length).toBeGreaterThan(0);
  expect(combat.log[0]).toContain('造成'); // 原来是 'strike'
});

// Line 61: "retaliates" → 改为检查中文 "反击"
it('enemy counterattack adds message to combat log', () => {
  const combat = createCombatState(100, 10, 5, dummyEnemy);
  executeCombatRound(combat, 'attack');
  expect(combat.log.some(l => l.includes('反击'))).toBe(true); // 原来是 'retaliates'
});

// Line 71: "disengaged"|"retreated" → 改为检查中文 "脱离"
it('flee success adds message to combat log', () => {
  const originalRandom = Math.random;
  Math.random = () => 0.3;
  const combat = createCombatState(100, 10, 5, dummyEnemy);
  executeCombatRound(combat, 'flee');
  Math.random = originalRandom;
  expect(combat.log.some(l => l.includes('脱离'))).toBe(true); // 原来是 'disengaged'|'retreated'
});

// Line 81: "Failed" → 改为检查中文 "失败"
it('flee failure adds message to combat log', () => {
  const originalRandom = Math.random;
  Math.random = () => 0.7;
  const combat = createCombatState(100, 10, 5, dummyEnemy);
  executeCombatRound(combat, 'flee');
  Math.random = originalRandom;
  expect(combat.log.some(l => l.includes('失败'))).toBe(true); // 原来是 'Failed'
});

// Line 114: "slain" → 改为检查中文 "击杀"
it('slain enemy message is added to combat log', () => {
  const combat = createCombatState(100, 999, 0, dummyEnemy);
  executeCombatRound(combat, 'attack');
  expect(combat.log.some(l => l.includes('击杀'))).toBe(true); // 原来是 'slain'
});
```

- [ ] **运行测试确认修复**

Run: `npx vitest run tests/roguelike/combat.test.ts -v`
Expected: All 14 tests PASS

- [ ] **提交**

```bash
git add tests/roguelike/combat.test.ts
git commit -m "fix: update combat test assertions to match Chinese log messages"
```

### Step 1.2: 创建技能定义文件

**Files:**
- Create: `src/roguelike/skills.ts`
- Create: `tests/roguelike/skills.test.ts`

- [ ] **先写技能测试（TDD - 红灯）**

```typescript
// tests/roguelike/skills.test.ts
import { describe, it, expect } from 'vitest';
import { getSkillsForClass, getSkillDef, CLASS_SKILLS } from '../../src/roguelike/skills.js';

describe('技能定义', () => {
  it('星际战士有3个技能', () => {
    const skills = getSkillsForClass('spaceMarine');
    expect(skills).toHaveLength(3);
  });

  it('审讯官有3个技能', () => {
    const skills = getSkillsForClass('inquisitor');
    expect(skills).toHaveLength(3);
  });

  it('机仆祭司有3个技能', () => {
    const skills = getSkillsForClass('techPriest');
    expect(skills).toHaveLength(3);
  });

  it('政委有3个技能', () => {
    const skills = getSkillsForClass('commissar');
    expect(skills).toHaveLength(3);
  });

  it('未知职业返回空数组', () => {
    const skills = getSkillsForClass('unknown');
    expect(skills).toEqual([]);
  });

  it('可以获取具体技能定义', () => {
    const skill = getSkillDef('spaceMarine', 'sm_charge');
    expect(skill).toBeDefined();
    expect(skill!.name).toBe('猛攻');
    expect(skill!.mpCost).toBe(15);
    expect(skill!.cooldown).toBe(0);
  });

  it('净化之火有 bonusVsTypes', () => {
    const skill = getSkillDef('inquisitor', 'inq_purge');
    expect(skill).toBeDefined();
    if (skill!.effect.type === 'damage') {
      expect(skill!.effect.multiplier).toBe(1.8);
      expect(skill!.effect.bonusVsTypes).toEqual(['chaos']);
      expect(skill!.effect.bonusMultiplier).toBe(0.5);
    }
  });

  it('处决射击有 threshold', () => {
    const skill = getSkillDef('commissar', 'com_execute');
    expect(skill).toBeDefined();
    expect(skill!.effect.type).toBe('execute');
    if (skill!.effect.type === 'execute') {
      expect(skill!.effect.threshold).toBe(0.3);
      expect(skill!.effect.multiplier).toBe(3.0);
    }
  });

  it('修复立场是 heal 类型', () => {
    const skill = getSkillDef('techPriest', 'tp_repair');
    expect(skill).toBeDefined();
    expect(skill!.effect.type).toBe('heal');
    if (skill!.effect.type === 'heal') {
      expect(skill!.effect.percent).toBe(30);
    }
  });

  it('振奋演说是 mp_restore 类型', () => {
    const skill = getSkillDef('commissar', 'com_rally');
    expect(skill).toBeDefined();
    expect(skill!.effect.type).toBe('mp_restore');
    if (skill!.effect.type === 'mp_restore') {
      expect(skill!.effect.amount).toBe(20);
    }
  });

  it('所有技能都有 id, name, icon, mpCost, cooldown', () => {
    for (const classId in CLASS_SKILLS) {
      for (const skill of CLASS_SKILLS[classId]) {
        expect(skill.id).toBeTruthy();
        expect(skill.name).toBeTruthy();
        expect(skill.icon).toBeTruthy();
        expect(typeof skill.mpCost).toBe('number');
        expect(typeof skill.cooldown).toBe('number');
        expect(typeof skill.effect).toBe('object');
      }
    }
  });
});
```

- [ ] **运行测试确认红灯**

Run: `npx vitest run tests/roguelike/skills.test.ts -v`
Expected: FAIL — module not found

- [ ] **实现 skills.ts（TDD - 绿灯）**

```typescript
// src/roguelike/skills.ts

export interface SkillDef {
  id: string;
  name: string;
  icon: string;
  mpCost: number;
  cooldown: number;
  description: string;
  effect: SkillEffect;
}

export type SkillEffect =
  | { type: 'damage'; multiplier: number; fixedBonusDamage?: number; bonusVsTypes?: string[]; bonusMultiplier?: number }
  | { type: 'execute'; threshold: number; multiplier: number }
  | { type: 'buff'; buffType: 'defense_half' | 'next_attack_boost' | 'lifesteal'; value?: number; duration: number }
  | { type: 'heal'; percent: number }
  | { type: 'mp_restore'; amount: number }
  | { type: 'immunity' };

export interface SkillBuffs {
  nextAttackBoost?: number;
  nextAttackBoostHits?: number;
  defenseHalf?: boolean;
  immunity?: boolean;
  lifestealHits?: number;
  lifestealPercent?: number; // 吸血百分比（从 skill.value 读取）
}

export const CLASS_SKILLS: Record<string, SkillDef[]> = {
  spaceMarine: [
    { id: 'sm_charge', name: '猛攻', icon: '⚔', mpCost: 15, cooldown: 0, description: '造成 150% 攻击力伤害', effect: { type: 'damage', multiplier: 1.5 } },
    { id: 'sm_shield_wall', name: '盾墙', icon: '🛡', mpCost: 10, cooldown: 2, description: '本回合受伤减半', effect: { type: 'buff', buffType: 'defense_half', duration: 1 } },
    { id: 'sm_tactical', name: '战术指令', icon: '✨', mpCost: 20, cooldown: 3, description: '下次攻击 +50% 伤害', effect: { type: 'buff', buffType: 'next_attack_boost', value: 50, duration: 1 } },
  ],
  inquisitor: [
    { id: 'inq_purge', name: '净化之火', icon: '🔥', mpCost: 25, cooldown: 2, description: '180% 伤害，恶魔系额外 +50%', effect: { type: 'damage', multiplier: 1.8, bonusVsTypes: ['chaos'], bonusMultiplier: 0.5 } },
    { id: 'inq_barrier', name: '精神壁垒', icon: '🧠', mpCost: 15, cooldown: 2, description: '免疫下一次攻击', effect: { type: 'immunity' } },
    { id: 'inq_judgment', name: '命运审判', icon: '⚖', mpCost: 35, cooldown: 4, description: '必定命中，200% 伤害', effect: { type: 'damage', multiplier: 2.0 } },
  ],
  techPriest: [
    { id: 'tp_overload', name: '过载激光', icon: '⚡', mpCost: 20, cooldown: 2, description: '130% 伤害 + 10 固定伤害', effect: { type: 'damage', multiplier: 1.3, fixedBonusDamage: 10 } },
    { id: 'tp_repair', name: '修复立场', icon: '🔧', mpCost: 15, cooldown: 3, description: '恢复 30% 最大生命值', effect: { type: 'heal', percent: 30 } },
    { id: 'tp_rage', name: '机器狂怒', icon: '🤖', mpCost: 15, cooldown: 2, description: '下2次攻击 +30%', effect: { type: 'buff', buffType: 'next_attack_boost', value: 30, duration: 2 } },
  ],
  commissar: [
    { id: 'com_execute', name: '处决射击', icon: '🎯', mpCost: 30, cooldown: 3, description: 'HP<30% 敌人 300% 伤害', effect: { type: 'execute', threshold: 0.3, multiplier: 3.0 } },
    { id: 'com_rally', name: '振奋演说', icon: '📢', mpCost: 10, cooldown: 2, description: '恢复 20 MP', effect: { type: 'mp_restore', amount: 20 } },
    { id: 'com_charge', name: '死亡冲锋', icon: '💀', mpCost: 25, cooldown: 3, description: '120% 伤害，吸血 50%', effect: { type: 'buff', buffType: 'lifesteal', value: 50, duration: 1 } },
  ],
};

export function getSkillsForClass(classId: string): SkillDef[] {
  return CLASS_SKILLS[classId] || [];
}

export function getSkillDef(classId: string, skillId: string): SkillDef | undefined {
  return CLASS_SKILLS[classId]?.find(s => s.id === skillId);
}
```

- [ ] **运行测试确认绿灯**

Run: `npx vitest run tests/roguelike/skills.test.ts -v`
Expected: All 11 tests PASS

- [ ] **运行全部测试确保无回归**

Run: `npx vitest run -v`
Expected: All tests PASS

- [ ] **提交**

```bash
git add src/roguelike/skills.ts tests/roguelike/skills.test.ts
git commit -m "feat: add skill definitions with 4 classes x 3 skills"
```

---

## Task 2: 扩展战斗状态和 DungeonRun

**背景:** 需要在 `CombatState` 和 `DungeonRun` 中添加 MP、冷却、buff 字段，并更新 `createCombatState` 签名。

### Step 2.1: 扩展 CombatState + createCombatState

**Files:**
- Modify: `src/roguelike/combat.ts`
- Modify: `tests/roguelike/combat.test.ts`

- [ ] **先写测试（TDD - 红灯）**

在 `tests/roguelike/combat.test.ts` 末尾新增 describe：

```typescript
// tests/roguelike/combat.test.ts — 新增在文件末尾
import type { SkillBuffs } from '../../src/roguelike/skills.js';

describe('CombatState 扩展', () => {
  it('createCombatState 接受 playerMp 参数', () => {
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    expect(combat.playerMp).toBe(50);
    expect(combat.playerMaxMp).toBe(50);
  });

  it('CombatState 有 skillCooldowns 和 skillBuffs', () => {
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    expect(combat.skillCooldowns).toEqual({});
    expect(combat.skillBuffs).toEqual({});
  });
});
```

- [ ] **运行测试确认红灯**

Run: `npx vitest run tests/roguelike/combat.test.ts -v`
Expected: FAIL — `createCombatState` 不接受 5 个参数

- [ ] **修改 CombatState 接口和 createCombatState**

```typescript
// src/roguelike/combat.ts — 修改以下内容

import type { SkillBuffs } from './skills.js';

export interface CombatState {
  playerHp: number;
  playerMaxHp: number;
  playerMp: number;
  playerMaxMp: number;
  playerAttack: number;
  playerDefense: number;
  enemy: EnemyDef;
  enemyHp: number;
  enemyMaxHp: number;
  fled: boolean;
  log: string[];
  skillCooldowns: Record<string, number>;
  skillBuffs: SkillBuffs;
}

export function createCombatState(
  playerHp: number, playerMp: number, playerAttack: number, playerDefense: number, enemy: EnemyDef
): CombatState {
  return {
    playerHp, playerMaxHp: playerHp,
    playerMp, playerMaxMp: playerMp,
    playerAttack, playerDefense,
    enemy: { ...enemy }, enemyHp: enemy.hp, enemyMaxHp: enemy.hp,
    fled: false, log: [],
    skillCooldowns: {},
    skillBuffs: {},
  };
}
```

- [ ] **更新已有测试中的 createCombatState 调用（添加 playerMp 参数）**

在所有已有的 `createCombatState(100, 10, 5, dummyEnemy)` 调用中，添加 `50` 作为第二个参数：

```typescript
// 原来的: createCombatState(100, 10, 5, dummyEnemy)
// 改为:   createCombatState(100, 50, 10, 5, dummyEnemy)
// 特殊值保持不变：
// createCombatState(100, 999, 0, dummyEnemy) → createCombatState(100, 50, 999, 0, dummyEnemy)
// createCombatState(1, 0, 0, dummyEnemy) → createCombatState(1, 50, 0, 0, dummyEnemy)
```

- [ ] **运行测试确认绿灯**

Run: `npx vitest run tests/roguelike/combat.test.ts -v`
Expected: All tests PASS

### Step 2.2: 扩展 DungeonRun 接口

**Files:**
- Modify: `src/roguelike/dungeonView.ts`

- [ ] **添加新字段到 DungeonRun 接口**

在 `DungeonRun` 接口（`dungeonView.ts:9-28`）中，在 `victory: boolean;` 之后添加：

```typescript
  // 新增：MP、技能冷却、buff
  playerMp: number;
  playerMaxMp: number;
  skillCooldowns: Record<string, number>;
  skillBuffs: SkillBuffs;
```

并在文件顶部添加 import：

```typescript
import type { SkillBuffs } from './skills.js';
```

- [ ] **更新 startDungeonRun 初始化**

在 `startDungeonRun` 返回对象中，在 `victory: false,` 之后添加：

```typescript
    playerMp: 50,
    playerMaxMp: 50,
    skillCooldowns: {},
    skillBuffs: {},
```

- [ ] **更新 startCombat 传递 MP**

修改 `startCombat` 函数（`dungeonView.ts:107-111`）：

```typescript
function startCombat(run: DungeonRun, enemy: { def: EnemyDef; x: number; y: number; hp: number; maxHp: number; isBoss?: boolean }): void {
  run.inCombat = true;
  run.combatState = createCombatState(run.playerHp, run.playerMp, run.playerAttack, run.playerDefense, enemy.def);
  run.combatLog = [];
  run.skillCooldowns = {};
  run.skillBuffs = {};
}
```

- [ ] **运行全部测试**

Run: `npx vitest run -v`
Expected: All tests PASS

- [ ] **提交**

```bash
git add src/roguelike/combat.ts src/roguelike/dungeonView.ts tests/roguelike/combat.test.ts
git commit -m "feat: extend CombatState and DungeonRun with MP, cooldowns, and buffs"
```

---

## Task 3: 实现技能执行逻辑（useSkill + endTurn）

**背景:** 在 `combat.ts` 中新增 `useSkill` 和 `endTurn` 函数，并修改 `executeCombatRound` 支持 buff 效果。

### Step 3.1: useSkill 函数

**Files:**
- Modify: `src/roguelike/combat.ts`
- Modify: `tests/roguelike/combat.test.ts`

- [ ] **先写测试（TDD - 红灯）**

```typescript
// tests/roguelike/combat.test.ts — 新增
import { useSkill, endTurn, executeEnemyTurn } from '../../src/roguelike/combat.js';
import { getSkillDef } from '../../src/roguelike/skills.js';

describe('useSkill', () => {
  it('使用技能消耗 MP', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    const skill = getSkillDef('spaceMarine', 'sm_charge')!;
    const result = useSkill(combat, skill);
    expect(result.success).toBe(true);
    expect(combat.playerMp).toBe(35); // 50 - 15
  });

  it('MP 不足时技能失败', () => {
    const combat = createCombatState(100, 5, 20, 5, dummyEnemy);
    const skill = getSkillDef('spaceMarine', 'sm_charge')!;
    const result = useSkill(combat, skill);
    expect(result.success).toBe(false);
    expect(result.message).toContain('MP');
    expect(combat.playerMp).toBe(5); // MP 未消耗
  });

  it('冷却中的技能无法使用', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    combat.skillCooldowns['sm_charge'] = 2;
    const skill = getSkillDef('spaceMarine', 'sm_charge')!;
    const result = useSkill(combat, skill);
    expect(result.success).toBe(false);
    expect(result.message).toContain('冷却');
  });

  it('使用技能后设置冷却', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    const skill = getSkillDef('inquisitor', 'inq_purge')!;
    useSkill(combat, skill);
    expect(combat.skillCooldowns['inq_purge']).toBe(2);
  });

  it('damage 类型技能对敌人造成伤害', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    const skill = getSkillDef('spaceMarine', 'sm_charge')!;
    useSkill(combat, skill);
    expect(combat.enemyHp).toBeLessThan(dummyEnemy.hp);
  });

  it('heal 类型技能恢复生命', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    combat.playerHp = 50;
    const skill = getSkillDef('techPriest', 'tp_repair')!;
    useSkill(combat, skill);
    expect(combat.playerHp).toBe(80); // 50 + 30% of 100
  });

  it('heal 不超过最大生命', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    combat.playerHp = 90;
    const skill = getSkillDef('techPriest', 'tp_repair')!;
    useSkill(combat, skill);
    expect(combat.playerHp).toBe(100); // capped
  });

  it('mp_restore 类型技能恢复 MP', () => {
    const combat = createCombatState(100, 20, 20, 5, dummyEnemy);
    const skill = getSkillDef('commissar', 'com_rally')!;
    useSkill(combat, skill);
    expect(combat.playerMp).toBe(40); // 20 + 20
  });

  it('immunity 类型技能设置免疫标记', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    const skill = getSkillDef('inquisitor', 'inq_barrier')!;
    useSkill(combat, skill);
    expect(combat.skillBuffs.immunity).toBe(true);
  });

  it('buff defense_half 设置减伤标记', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    const skill = getSkillDef('spaceMarine', 'sm_shield_wall')!;
    useSkill(combat, skill);
    expect(combat.skillBuffs.defenseHalf).toBe(true);
  });

  it('buff next_attack_boost 设置攻击加成', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    const skill = getSkillDef('spaceMarine', 'sm_tactical')!;
    useSkill(combat, skill);
    expect(combat.skillBuffs.nextAttackBoost).toBe(50);
    expect(combat.skillBuffs.nextAttackBoostHits).toBe(1);
  });

  it('execute 技能在敌人低血量时造成高额伤害', () => {
    const weakEnemy: EnemyDef = { id: 'test', name: 'Test', type: 'ork', hp: 100, attack: 5, defense: 2, exp: 10, minFloor: 1 };
    const combat = createCombatState(100, 50, 20, 2, weakEnemy);
    combat.enemyHp = 20; // 20%
    const skill = getSkillDef('commissar', 'com_execute')!;
    useSkill(combat, skill);
    expect(combat.enemyHp).toBeLessThan(20); // 300% multiplier
  });

  it('execute 技能在敌人高血量时使用普通倍率', () => {
    const weakEnemy: EnemyDef = { id: 'test', name: 'Test', type: 'ork', hp: 100, attack: 5, defense: 2, exp: 10, minFloor: 1 };
    const combat = createCombatState(100, 50, 20, 2, weakEnemy);
    combat.enemyHp = 80; // 80% — above 30% threshold
    const originalHp = combat.enemyHp;
    const skill = getSkillDef('commissar', 'com_execute')!;
    useSkill(combat, skill);
    // With multiplier=1.0 (no execute bonus), damage should be much less than 300%
    expect(combat.enemyHp).toBeGreaterThan(originalHp - 60); // much less damage than 300%
  });

  it('bonusVsTypes 对 chaos 敌人额外伤害', () => {
    const chaosEnemy: EnemyDef = { id: 'daemon', name: 'Daemon', type: 'chaos', hp: 100, attack: 10, defense: 5, exp: 20, minFloor: 1 };
    const combat = createCombatState(100, 50, 20, 5, chaosEnemy);
    const skill = getSkillDef('inquisitor', 'inq_purge')!;
    useSkill(combat, skill);
    expect(combat.enemyHp).toBeLessThan(100);
    // The log should indicate the bonus damage
    expect(combat.log.some(l => l.includes('造成'))).toBe(true);
  });
});

describe('endTurn', () => {
  it('恢复 10 MP', () => {
    const combat = createCombatState(100, 20, 20, 5, dummyEnemy);
    endTurn(combat);
    expect(combat.playerMp).toBe(30);
  });

  it('MP 不超过上限', () => {
    const combat = createCombatState(100, 45, 20, 5, dummyEnemy);
    endTurn(combat);
    expect(combat.playerMp).toBe(50); // capped at max
  });

  it('减少技能冷却 1', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    combat.skillCooldowns['sm_shield_wall'] = 2;
    endTurn(combat);
    expect(combat.skillCooldowns['sm_shield_wall']).toBe(1);
  });

  it('冷却归零后保留记录', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    combat.skillCooldowns['sm_shield_wall'] = 1;
    endTurn(combat);
    expect(combat.skillCooldowns['sm_shield_wall']).toBe(0);
  });
});

describe('executeEnemyTurn', () => {
  it('敌人造成伤害', () => {
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    const prevHp = combat.playerHp;
    executeEnemyTurn(combat);
    expect(combat.playerHp).toBeLessThan(prevHp);
  });

  it('immunity 阻挡敌人攻击', () => {
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    combat.skillBuffs.immunity = true;
    executeEnemyTurn(combat);
    expect(combat.playerHp).toBe(100);
    expect(combat.skillBuffs.immunity).toBeUndefined();
  });

  it('defenseHalf 减少敌人伤害', () => {
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    combat.skillBuffs.defenseHalf = true;
    executeEnemyTurn(combat);
    expect(combat.skillBuffs.defenseHalf).toBeUndefined();
  });
});
```

- [ ] **运行测试确认红灯**

Run: `npx vitest run tests/roguelike/combat.test.ts -v`
Expected: FAIL — `useSkill` and `endTurn` not exported

- [ ] **实现 useSkill 和 endTurn**

在 `src/roguelike/combat.ts` 中添加以下代码：

```typescript
import type { SkillDef } from './skills.js';
import type { SkillBuffs } from './skills.js';

// 修改 calcDamage 添加 multiplier 参数
function calcDamage(attack: number, defense: number, multiplier: number = 1): number {
  const base = Math.max(1, attack - defense);
  const randomized = base + Math.floor(Math.random() * 3) - 1;
  return Math.max(1, Math.floor(randomized * multiplier));
}

export function useSkill(
  state: CombatState,
  skill: SkillDef,
): { success: boolean; message: string } {
  if (state.playerMp < skill.mpCost) {
    return { success: false, message: `MP 不足，需要 ${skill.mpCost} MP` };
  }
  if ((state.skillCooldowns[skill.id] || 0) > 0) {
    return { success: false, message: `${skill.name} 还在冷却中` };
  }

  state.playerMp -= skill.mpCost;
  state.skillCooldowns[skill.id] = skill.cooldown;

  switch (skill.effect.type) {
    case 'damage': {
      const { multiplier, fixedBonusDamage = 0, bonusVsTypes, bonusMultiplier = 0 } = skill.effect;
      let effectiveMultiplier = multiplier;
      if (bonusVsTypes?.includes(state.enemy.type)) {
        effectiveMultiplier += bonusMultiplier;
      }
      const baseDmg = calcDamage(state.playerAttack, state.enemy.defense, effectiveMultiplier);
      const totalDmg = baseDmg + fixedBonusDamage;
      state.enemyHp = Math.max(0, state.enemyHp - totalDmg);
      state.log.push(`${skill.icon} ${skill.name}！对 ${state.enemy.name} 造成了 ${totalDmg} 点伤害！`);
      break;
    }
    case 'execute': {
      const { threshold, multiplier } = skill.effect;
      const effectiveMultiplier = (state.enemyHp / state.enemyMaxHp) < threshold ? multiplier : 1.0;
      const dmg = calcDamage(state.playerAttack, state.enemy.defense, effectiveMultiplier);
      state.enemyHp = Math.max(0, state.enemyHp - dmg);
      state.log.push(`${skill.icon} ${skill.name}！对 ${state.enemy.name} 造成了 ${dmg} 点伤害！`);
      break;
    }
    case 'buff': {
      const { buffType, value, duration } = skill.effect;
      switch (buffType) {
        case 'defense_half':
          state.skillBuffs.defenseHalf = true;
          state.log.push(`${skill.icon} ${skill.name}！本回合受伤减半！`);
          break;
        case 'next_attack_boost':
          state.skillBuffs.nextAttackBoost = value;
          state.skillBuffs.nextAttackBoostHits = duration;
          state.log.push(`${skill.icon} ${skill.name}！接下来 ${duration} 次攻击伤害 +${value}%！`);
          break;
        case 'lifesteal':
          state.skillBuffs.lifestealHits = (state.skillBuffs.lifestealHits || 0) + duration;
          state.skillBuffs.lifestealPercent = value || 50; // 存储吸血百分比
          state.log.push(`${skill.icon} ${skill.name}！接下来 ${duration} 次攻击吸取生命！`);
          break;
      }
      break;
    }
    case 'immunity':
      state.skillBuffs.immunity = true;
      state.log.push(`${skill.icon} ${skill.name}！免疫下一次攻击！`);
      break;
    case 'heal': {
      const healAmount = Math.floor(state.playerMaxHp * (skill.effect.percent / 100));
      state.playerHp = Math.min(state.playerMaxHp, state.playerHp + healAmount);
      state.log.push(`${skill.icon} ${skill.name}！恢复了 ${healAmount} 点生命！`);
      break;
    }
    case 'mp_restore': {
      const restoreAmount = Math.min(skill.effect.amount, state.playerMaxMp - state.playerMp);
      state.playerMp += restoreAmount;
      state.log.push(`${skill.icon} ${skill.name}！恢复了 ${restoreAmount} 点 MP！`);
      break;
    }
  }

  return { success: true, message: '' };
}

export function endTurn(state: CombatState): void {
  state.playerMp = Math.min(state.playerMaxMp, state.playerMp + 10);
  for (const skillId in state.skillCooldowns) {
    if (state.skillCooldowns[skillId] > 0) {
      state.skillCooldowns[skillId]--;
    }
  }
}

/** 敌人回合：仅执行敌人攻击（不包含玩家行动） */
export function executeEnemyTurn(state: CombatState): void {
  if (state.skillBuffs.immunity) {
    state.skillBuffs.immunity = undefined;
    state.log.push('精神壁垒抵挡了攻击！');
    return;
  }

  let enemyDmg = calcDamage(state.enemy.attack, state.playerDefense);
  if (state.skillBuffs.defenseHalf) {
    enemyDmg = Math.floor(enemyDmg / 2);
    state.skillBuffs.defenseHalf = undefined;
  }
  state.playerHp = Math.max(0, state.playerHp - enemyDmg);
  state.log.push(`${state.enemy.name} 反击造成了 ${enemyDmg} 点伤害！`);
}
```

- [ ] **运行测试确认绿灯**

Run: `npx vitest run tests/roguelike/combat.test.ts -v`
Expected: All tests PASS

- [ ] **提交**

```bash
git add src/roguelike/combat.ts tests/roguelike/combat.test.ts
git commit -m "feat: implement useSkill and endTurn with MP, cooldowns, and buffs"
```

### Step 3.2: 修改 executeCombatRound 支持 buff

**Files:**
- Modify: `src/roguelike/combat.ts`
- Modify: `tests/roguelike/combat.test.ts`

- [ ] **先写测试（TDD - 红灯）**

```typescript
// tests/roguelike/combat.test.ts — 新增
describe('executeCombatRound with buffs', () => {
  it('nextAttackBoost 增加攻击伤害', () => {
    const strongEnemy: EnemyDef = { id: 'tank', name: 'Tank', type: 'ork', hp: 200, attack: 0, defense: 5, exp: 10, minFloor: 1 };
    const combat = createCombatState(100, 50, 20, 5, strongEnemy);
    combat.skillBuffs.nextAttackBoost = 50;
    combat.skillBuffs.nextAttackBoostHits = 1;

    // 先执行一次攻击记录 boosted 伤害
    executeCombatRound(combat, 'attack');
    const boostedDmg = 200 - combat.enemyHp;

    // buff 应该消耗
    expect(combat.skillBuffs.nextAttackBoost).toBeUndefined();
    expect(combat.skillBuffs.nextAttackBoostHits).toBeUndefined();

    // 第二次攻击没有 boost
    const prevEnemyHp = combat.enemyHp;
    executeCombatRound(combat, 'attack');
    const normalDmg = prevEnemyHp - combat.enemyHp;

    // boosted 伤害应该显著高于 normal
    expect(boostedDmg).toBeGreaterThan(normalDmg);
  });

  it('defenseHalf 减少受到的伤害', () => {
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    combat.skillBuffs.defenseHalf = true;

    executeCombatRound(combat, 'attack');
    // defenseHalf 应该已经被消耗
    expect(combat.skillBuffs.defenseHalf).toBeUndefined();
  });

  it('immunity 阻挡敌人攻击', () => {
    const combat = createCombatState(100, 50, 10, 5, dummyEnemy);
    combat.skillBuffs.immunity = true;
    const prevHp = combat.playerHp;

    executeCombatRound(combat, 'attack');
    // immunity 应该抵挡了敌人反击，HP 不变
    expect(combat.playerHp).toBe(prevHp);
    expect(combat.skillBuffs.immunity).toBeUndefined();
  });

  it('lifesteal 吸取生命', () => {
    const combat = createCombatState(100, 50, 20, 5, dummyEnemy);
    combat.skillBuffs.lifestealHits = 1;
    combat.skillBuffs.nextAttackBoost = 0;
    const prevHp = combat.playerHp;

    executeCombatRound(combat, 'attack');
    // player should have healed from lifesteal
    expect(combat.playerHp).toBeGreaterThan(prevHp);
  });
});
```

- [ ] **运行测试确认红灯**

Run: `npx vitest run tests/roguelike/combat.test.ts -v`
Expected: FAIL — buff logic not in executeCombatRound

- [ ] **修改 executeCombatRound 支持 buff**

将 `executeCombatRound` 替换为：

```typescript
export function executeCombatRound(state: CombatState, action: 'attack' | 'flee'): void {
  if (action === 'flee') {
    state.fled = Math.random() < 0.5;
    if (state.fled) {
      state.log.push('你脱离战斗撤退了！');
    } else {
      state.log.push('撤退失败！');
      let dmg = calcDamage(state.enemy.attack, state.playerDefense);
      if (state.skillBuffs.defenseHalf) {
        dmg = Math.floor(dmg / 2);
        state.skillBuffs.defenseHalf = undefined;
      }
      state.playerHp = Math.max(0, state.playerHp - dmg);
      state.log.push(`${state.enemy.name} 造成了 ${dmg} 点伤害！`);
    }
    return;
  }

  // Player attacks
  let multiplier = 1;
  if (state.skillBuffs.nextAttackBoost && (state.skillBuffs.nextAttackBoostHits ?? 0) > 0) {
    multiplier += state.skillBuffs.nextAttackBoost / 100;
    state.skillBuffs.nextAttackBoostHits!--;
    if (state.skillBuffs.nextAttackBoostHits <= 0) {
      state.skillBuffs.nextAttackBoost = undefined;
      state.skillBuffs.nextAttackBoostHits = undefined;
    }
  }

  const playerDmg = calcDamage(state.playerAttack, state.enemy.defense, multiplier);

  // Lifesteal
  if (state.skillBuffs.lifestealHits && state.skillBuffs.lifestealHits > 0) {
    const stealPercent = state.skillBuffs.lifestealPercent || 50;
    const healAmount = Math.floor(playerDmg * (stealPercent / 100));
    state.playerHp = Math.min(state.playerMaxHp, state.playerHp + healAmount);
    state.log.push(`吸取了 ${healAmount} 点生命！`);
    state.skillBuffs.lifestealHits--;
    if (state.skillBuffs.lifestealHits <= 0) {
      state.skillBuffs.lifestealHits = undefined;
    }
  }

  state.enemyHp = Math.max(0, state.enemyHp - playerDmg);
  state.log.push(`你对 ${state.enemy.name} 造成了 ${playerDmg} 点伤害！`);

  if (state.enemyHp <= 0) {
    state.log.push(`${state.enemy.name} 已被击杀！帝皇庇佑！`);
    return;
  }

  // Enemy counterattacks（复用 executeEnemyTurn）
  executeEnemyTurn(state);
}
```

- [ ] **运行测试确认绿灯**

Run: `npx vitest run tests/roguelike/combat.test.ts -v`
Expected: All tests PASS

- [ ] **运行全部测试**

Run: `npx vitest run -v`
Expected: All tests PASS

- [ ] **提交**

```bash
git add src/roguelike/combat.ts tests/roguelike/combat.test.ts
git commit -m "feat: integrate buffs into executeCombatRound"
```

---

## Task 4: Canvas 初始化修复

**背景:** `main.ts` 中 `container.clientWidth` 在 `ui.showView('dungeon')` 之前调用，此时 `#view-dungeon` 的 `display:none` 导致宽度为 0。

**Files:**
- Modify: `src/main.ts:146-156`

- [ ] **修复 Canvas 初始化顺序**

将 `main.ts` 中 `onPlanetSelect` 回调的这段代码：

```typescript
// 当前（错误顺序）
const canvas = document.getElementById('dungeon-canvas') as HTMLCanvasElement;
const container = document.getElementById('dungeon-container')!;
const w = Math.min(container.clientWidth, 640);
canvas.width = w;
canvas.height = Math.floor(w * 0.75);
dungeonRenderer = new CanvasRenderer('dungeon-canvas');

document.getElementById('dungeon-result')!.style.display = 'none';
document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
document.querySelector('[data-view="dungeon"]')!.classList.add('active');
ui.showView('dungeon');
```

改为：

```typescript
// 修复后（正确顺序）
document.getElementById('dungeon-result')!.style.display = 'none';
document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
document.querySelector('[data-view="dungeon"]')!.classList.add('active');
ui.showView('dungeon'); // 先显示 view，使 clientWidth 可用

const canvas = document.getElementById('dungeon-canvas') as HTMLCanvasElement;
const container = document.getElementById('dungeon-container')!;
const w = Math.min(container.clientWidth, 640);
canvas.width = w;
canvas.height = Math.floor(w * 0.75);
dungeonRenderer = new CanvasRenderer('dungeon-canvas');
```

- [ ] **运行全部测试**

Run: `npx vitest run -v`
Expected: All tests PASS

- [ ] **提交**

```bash
git add src/main.ts
git commit -m "fix: canvas size calculation after view becomes visible"
```

---

## Task 5: HTML 战斗界面布局

**背景:** 将 `index.html` 中的简单 combat-panel 替换为方案B的帝国军械库风格战斗界面。

**Files:**
- Modify: `index.html:120-166`

- [ ] **替换 `#view-dungeon` 内的 DOM 结构**

将 `index.html` 中从 `<!-- ── Dungeon View ── -->` 到 `</div>` (closing view-dungeon) 的全部内容替换为：

```html
    <!-- ── Dungeon View ── -->
    <div id="view-dungeon" class="view">
      <div id="dungeon-hud">
        <span id="dungeon-floor">第 I 层</span>
        <span class="hud-divider" aria-hidden="true">◆</span>
        <span id="dungeon-hp">生命: 100 / 100</span>
        <span class="hud-divider" aria-hidden="true">◆</span>
        <span id="dungeon-atk">攻击: 10</span>
        <span class="hud-divider" aria-hidden="true">◆</span>
        <span id="dungeon-def">防御: 3</span>
        <span class="hud-divider" aria-hidden="true">◆</span>
        <span id="dungeon-exp">经验: 0</span>
      </div>

      <!-- 战斗界面 -->
      <div id="battle-screen" class="battle-screen" style="display:none">
        <div class="battle-header">
          <span class="battle-title">⚔ 遭遇战斗</span>
          <span class="floor-indicator" id="battle-floor">第 I 层</span>
        </div>
        <div class="battle-arena">
          <div class="combatant enemy">
            <div class="sprite-box" id="enemy-sprite">👹</div>
            <div class="combatant-info">
              <div class="combatant-name" id="enemy-name">敌人名称</div>
              <div class="stat-bar">
                <span class="stat-label">HP</span>
                <div class="stat-bar-bg">
                  <div class="stat-bar-fill hp" id="enemy-hp-bar" style="width:100%"></div>
                </div>
                <span class="stat-value" id="enemy-hp-text">100/100</span>
              </div>
            </div>
          </div>
          <div class="combatant player">
            <div class="sprite-box" id="player-sprite">⚔</div>
            <div class="combatant-info">
              <div class="combatant-name" id="player-battle-name">星际战士</div>
              <div class="stat-bar">
                <span class="stat-label">HP</span>
                <div class="stat-bar-bg">
                  <div class="stat-bar-fill hp" id="player-hp-bar" style="width:100%"></div>
                </div>
                <span class="stat-value" id="player-hp-text">100/100</span>
              </div>
              <div class="stat-bar">
                <span class="stat-label">MP</span>
                <div class="stat-bar-bg mp">
                  <div class="stat-bar-fill mp" id="player-mp-bar" style="width:100%"></div>
                </div>
                <span class="stat-value" id="player-mp-text">50/50</span>
              </div>
            </div>
          </div>
        </div>
        <div class="battle-panel">
          <div class="panel-section">
            <div class="panel-title">▸ 战斗指令</div>
            <div class="actions" id="battle-actions">
              <button class="action-btn attack" id="btn-attack">⚔ 攻击</button>
              <button class="action-btn skill" id="btn-skill1">—</button>
              <button class="action-btn skill" id="btn-skill2">—</button>
              <button class="action-btn skill" id="btn-skill3">—</button>
              <button class="action-btn flee" id="btn-flee">🏃 撤退</button>
            </div>
          </div>
          <div class="panel-section">
            <div class="panel-title">▸ 角色状态</div>
            <div class="player-status-brief">
              <div class="stat-bar">
                <span class="stat-label">HP</span>
                <div class="stat-bar-bg"><div class="stat-bar-fill hp" id="status-hp-bar" style="width:100%"></div></div>
                <span class="stat-value" id="status-hp-text">100/100</span>
              </div>
              <div class="stat-bar">
                <span class="stat-label">MP</span>
                <div class="stat-bar-bg mp"><div class="stat-bar-fill mp" id="status-mp-bar" style="width:100%"></div></div>
                <span class="stat-value" id="status-mp-text">50/50</span>
              </div>
            </div>
            <div class="skill-cooldowns" id="skill-cooldowns">
              <span class="cooldown-label">冷却:</span>
              <span id="cd-skill1" class="cooldown-item">—</span>
              <span id="cd-skill2" class="cooldown-item">—</span>
              <span id="cd-skill3" class="cooldown-item">—</span>
            </div>
          </div>
          <div class="panel-section combat-log">
            <div class="panel-title">▸ 战斗记录</div>
            <div class="log-entries" id="battle-log">
              <div class="log-entry system">选择你的行动...</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 地牢探索界面 -->
      <div id="dungeon-explore">
        <div id="dungeon-container">
          <span class="corner-bl" aria-hidden="true"></span>
          <span class="corner-br" aria-hidden="true"></span>
          <canvas id="dungeon-canvas"></canvas>
        </div>
        <div id="dungeon-log"></div>
        <div id="dungeon-controls">
          <div class="control-row">
            <button class="move-btn" data-dir="up">&#9650;</button>
          </div>
          <div class="control-row">
            <button class="move-btn" data-dir="left">&#9664;</button>
            <button class="move-btn" data-dir="wait">&#9632;</button>
            <button class="move-btn" data-dir="right">&#9654;</button>
          </div>
          <div class="control-row">
            <button class="move-btn" data-dir="down">&#9660;</button>
          </div>
        </div>
      </div>

      <div id="dungeon-result" style="display:none"></div>
    </div>
```

- [ ] **提交**

```bash
git add index.html
git commit -m "feat: add Plan B battle UI layout to index.html"
```

---

## Task 6: CSS 战斗样式

**背景:** 为方案B战斗界面添加帝国军械库风格的 CSS 样式。

**Files:**
- Modify: `src/styles/main.css`

- [ ] **在 `/* 12. REDUCED MOTION */` 之前添加战斗界面样式**

```css
/* ============================================================
   9b. BATTLE VIEW — Imperial Arsenal Style
   ============================================================ */

/* 战斗界面容器 */
.battle-screen {
  animation: battle-enter 300ms var(--ease-out-quart) both;
}

@keyframes battle-enter {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.battle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-5);
  background: var(--bg-panel);
  border: 1px solid var(--border-dim);
  border-left: 3px solid var(--gold-40);
  margin-bottom: var(--space-3);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
}

.battle-title {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 700;
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--red-20);
}

.floor-indicator {
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold-50);
  border: 1px solid var(--gold-60);
  padding: 2px var(--space-2);
}

/* 战斗场景 */
.battle-arena {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--atmosphere-void);
  border: 1px solid var(--border-dim);
  border-top: 3px solid var(--gold-50);
  padding: var(--space-6) var(--space-8);
  margin-bottom: var(--space-3);
  min-height: 160px;
}

.combatant {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.combatant.enemy { align-items: flex-start; }
.combatant.player { align-items: flex-end; }

.sprite-box {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  background: oklch(4% 0.005 70 / 0.7);
  border: 2px solid;
}

.combatant.enemy .sprite-box {
  border-color: var(--red-40);
  box-shadow: 0 0 20px oklch(48% 0.18 25 / 0.3);
}

.combatant.player .sprite-box {
  border-color: var(--gold-40);
  box-shadow: 0 0 20px oklch(62% 0.15 70 / 0.3);
}

.combatant-info {
  text-align: center;
  min-width: 140px;
}

.combatant.enemy .combatant-info { text-align: left; }
.combatant.player .combatant-info { text-align: right; }

.combatant-name {
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--gold-20);
  margin-bottom: var(--space-2);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

/* 状态条 — 战斗用 */
.battle-arena .stat-bar,
.battle-panel .stat-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: 2px;
}

.battle-arena .stat-label,
.battle-panel .stat-label {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 600;
  color: var(--gold-50);
  width: 20px;
  text-align: right;
}

.battle-arena .stat-bar-bg,
.battle-panel .stat-bar-bg {
  flex: 1;
  height: 8px;
  background: var(--surface-3);
  border: 1px solid var(--surface-5);
  overflow: hidden;
}

.battle-panel .stat-bar-bg.mp {
  border-color: var(--blue-40);
}

.battle-arena .stat-bar-fill,
.battle-panel .stat-bar-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.battle-arena .stat-bar-fill.hp,
.battle-panel .stat-bar-fill.hp {
  background: linear-gradient(90deg, #4a2, #6c4);
}

.battle-arena .stat-bar-fill.hp.medium,
.battle-panel .stat-bar-fill.hp.medium {
  background: linear-gradient(90deg, #a4, #c6);
}

.battle-arena .stat-bar-fill.hp.low,
.battle-panel .stat-bar-fill.hp.low {
  background: linear-gradient(90deg, #c42, #e64);
}

.battle-arena .stat-bar-fill.mp,
.battle-panel .stat-bar-fill.mp {
  background: linear-gradient(90deg, #24c, #48e);
}

.battle-arena .stat-value,
.battle-panel .stat-value {
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold-30);
  font-variant-numeric: tabular-nums;
  min-width: 55px;
  text-align: right;
}

/* 战斗面板 */
.battle-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.battle-panel .panel-section {
  background: var(--surface-2);
  border: 1px solid var(--border-dim);
  padding: var(--space-3) var(--space-4);
}

.panel-title {
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--gold-50);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--border-dim);
}

/* 行动按钮 */
.battle-panel .actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}

.action-btn {
  background: transparent;
  border: 1px solid;
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease-out-quart),
    color var(--duration-fast) var(--ease-out-quart),
    transform var(--duration-fast) var(--ease-out-quart);
}

.action-btn.attack {
  border-color: var(--red-40);
  color: var(--red-20);
}
.action-btn.attack:hover {
  background: oklch(from var(--red-40) r g b / 0.2);
  color: var(--red-10);
}

.action-btn.skill {
  border-color: var(--gold-40);
  color: var(--gold-30);
}
.action-btn.skill:hover:not(:disabled) {
  background: oklch(from var(--gold-40) r g b / 0.15);
  color: var(--gold-10);
}
.action-btn.skill:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.action-btn.flee {
  border-color: var(--gold-40);
  color: var(--gold-30);
  grid-column: 1 / -1;
}
.action-btn.flee:hover {
  background: oklch(from var(--gold-40) r g b / 0.15);
  color: var(--gold-10);
}

/* 角色状态面板 */
.player-status-brief {
  margin-bottom: var(--space-2);
}

/* 冷却显示 */
.skill-cooldowns {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  font-size: var(--text-xs);
  color: var(--gold-50);
  margin-top: var(--space-2);
}

.cooldown-label {
  font-family: var(--font-display);
}

.cooldown-item {
  padding: 1px var(--space-2);
  background: var(--surface-3);
  border: 1px solid var(--border-dim);
  font-variant-numeric: tabular-nums;
  font-family: var(--font-display);
  font-size: 10px;
}

.cooldown-item.ready {
  color: var(--accent-success);
  border-color: var(--accent-success);
}

.cooldown-item.on-cooldown {
  color: var(--red-30);
  border-color: var(--red-40);
}

/* 战斗记录 */
.combat-log {
  grid-column: 1 / -1;
  background: var(--atmosphere-ink);
  border-color: var(--red-50);
  border-left: 3px solid var(--red-40);
}

.log-entries {
  max-height: 80px;
  overflow-y: auto;
  font-size: var(--text-sm);
  color: var(--gold-30);
  line-height: var(--leading-relaxed);
}

.log-entry { margin-bottom: var(--space-1); }
.log-entry.damage { color: var(--red-20); }
.log-entry.heal { color: var(--accent-success); }
.log-entry.system { color: var(--gold-50); font-style: italic; }
.log-entry.player-action { color: var(--gold-20); }

/* 地牢探索 — 战斗时隐藏 */
#dungeon-explore { display: block; }
#dungeon-explore.hidden { display: none; }
```

同时需要将旧的 `#combat-panel` 样式（CSS 第 1057-1143 行）保留但加上条件注释说明它已被 `.battle-screen` 替代。实际上旧代码 `#combat-panel` 的 HTML 已被移除，所以对应 CSS 也应移除。

- [ ] **移除旧的 #combat-panel 样式**

删除 CSS 中从 `/* Combat panel — slide in from top when combat begins */` 到 `.combat-btn:disabled {` 块结束的样式（约 `main.css:1057-1143`）。

- [ ] **提交**

```bash
git add src/styles/main.css
git commit -m "style: add Plan B battle UI CSS, remove old combat panel styles"
```

---

## Task 7: 主程序集成

**背景:** 在 `main.ts` 中集成新的战斗 UI 渲染逻辑、技能按钮绑定、战斗/探索视图切换。

### Step 7.1: 新增 dungeonView.ts 的 useSkillById

**Files:**
- Modify: `src/roguelike/dungeonView.ts`

- [ ] **添加 useSkillById 函数**

在 `dungeonView.ts` 中添加 import 和新函数：

```typescript
import { getSkillsForClass, getSkillDef } from './skills.js';
import { useSkill, executeEnemyTurn, endTurn } from './combat.js';

export function useSkillById(run: DungeonRun, classId: string, skillId: string): void {
  if (!run.inCombat || !run.combatState) return;

  const skill = getSkillDef(classId, skillId);
  if (!skill) return;

  const result = useSkill(run.combatState, skill);
  run.combatLog.push(...run.combatState.log);
  run.combatState.log = [];

  if (!result.success) {
    run.combatLog.push(result.message);
    return;
  }

  // 同步 MP 和冷却到 DungeonRun
  run.playerMp = run.combatState.playerMp;
  run.skillCooldowns = run.combatState.skillCooldowns;
  run.skillBuffs = run.combatState.skillBuffs;

  if (isCombatOver(run.combatState)) {
    resolveCombat(run);
  } else {
    // 敌人回合：敌人反击（除非敌人已死）
    executeEnemyTurn(run.combatState);
    run.combatLog.push(...run.combatState.log);
    run.combatState.log = [];

    if (isCombatOver(run.combatState)) {
      resolveCombat(run);
    } else {
      // 回合结束：MP 恢复、冷却减少
      endTurn(run.combatState);
      run.playerMp = run.combatState.playerMp;
      run.skillCooldowns = run.combatState.skillCooldowns;
    }
  }
}
```

### Step 7.2: 更新 main.ts 战斗渲染和事件

**Files:**
- Modify: `src/main.ts`

- [ ] **更新 imports**

在 `main.ts` 顶部添加：

```typescript
import { useSkillById } from './roguelike/dungeonView.js';
import { getSkillsForClass } from './roguelike/skills.js';
import { endTurn, executeEnemyTurn } from './roguelike/combat.js';
```

- [ ] **添加模块级 gameState 变量**

在 `main.ts` 顶部的 `let dungeonRenderer` 之后添加：

```typescript
let gameState: GameState | null = null;
```

在 `init()` 函数内，`const state = createGameState()` 之后添加：

```typescript
gameState = state;
```

**注意:** `renderBattleUI` 需要访问 `state.player.class`，但 `state` 是 `init()` 的局部变量。解决方案是将 `state` 提升到模块作用域（通过 `gameState` 变量）。

- [ ] **替换 renderDungeonView 函数**

将 `main.ts` 中的 `renderDungeonView` 函数（约第 29-71 行）替换为：

```typescript
function renderDungeonView(): void {
  if (!dungeonRun) return;

  // HUD
  document.getElementById('dungeon-floor')!.textContent = `第 ${toRoman(dungeonRun.currentFloor)} 层 / 第 ${toRoman(dungeonRun.maxFloors)} 层`;
  document.getElementById('dungeon-hp')!.textContent = `生命: ${dungeonRun.playerHp} / ${dungeonRun.playerMaxHp}`;
  document.getElementById('dungeon-atk')!.textContent = `攻击: ${dungeonRun.playerAttack}`;
  document.getElementById('dungeon-def')!.textContent = `防御: ${dungeonRun.playerDefense}`;
  document.getElementById('dungeon-exp')!.textContent = `经验: ${dungeonRun.exp}`;

  const battleScreen = document.getElementById('battle-screen')!;
  const dungeonExplore = document.getElementById('dungeon-explore')!;

  if (dungeonRun.inCombat && dungeonRun.combatState) {
    battleScreen.style.display = 'block';
    dungeonExplore.classList.add('hidden');
    renderBattleUI(dungeonRun);
  } else {
    battleScreen.style.display = 'none';
    dungeonExplore.classList.remove('hidden');

    document.getElementById('dungeon-log')!.innerHTML =
      dungeonRun.combatLog.slice(-5).map(l => `<p>${l}</p>`).join('');

    if (dungeonRenderer) {
      dungeonRenderer.renderDungeon(
        dungeonRun.dungeon, dungeonRun.fog, dungeonRun.playerPos,
        dungeonRun.activeEnemies, dungeonRun.activeItems,
      );
    }
  }

  if (dungeonRun.gameOver) {
    const resultEl = document.getElementById('dungeon-result')!;
    resultEl.style.display = 'block';
    if (dungeonRun.victory) {
      resultEl.innerHTML = `<h2>远征完成</h2><p>所有楼层已清理！帝皇庇佑！</p><p>获得经验: ${dungeonRun.exp} | 战利品: ${dungeonRun.loot.join(', ') || '无'}</p>`;
    } else {
      resultEl.innerHTML = `<h2>战死沙场</h2><p>帝皇庇佑……来世再见。</p><p>获得经验: ${dungeonRun.exp}</p>`;
    }
  }
}

function renderBattleUI(run: DungeonRun): void {
  const cs = run.combatState!;
  const playerClass = gameState!.player.class;
  const skills = getSkillsForClass(playerClass);

  // 敌人信息
  document.getElementById('battle-floor')!.textContent = `第 ${toRoman(run.currentFloor)} 层`;
  document.getElementById('enemy-name')!.textContent = cs.enemy.name;
  const enemyHpPct = (cs.enemyHp / cs.enemyMaxHp) * 100;
  document.getElementById('enemy-hp-bar')!.style.width = `${enemyHpPct}%`;
  document.getElementById('enemy-hp-text')!.textContent = `${cs.enemyHp}/${cs.enemyMaxHp}`;

  // 玩家信息
  document.getElementById('player-battle-name')!.textContent = playerClass === 'spaceMarine' ? '星际战士'
    : playerClass === 'inquisitor' ? '审讯官'
    : playerClass === 'techPriest' ? '机仆祭司'
    : '政委';
  const playerHpPct = (cs.playerHp / cs.playerMaxHp) * 100;
  document.getElementById('player-hp-bar')!.style.width = `${playerHpPct}%`;
  document.getElementById('player-hp-text')!.textContent = `${cs.playerHp}/${cs.playerMaxHp}`;
  const mpPct = (cs.playerMp / cs.playerMaxMp) * 100;
  document.getElementById('player-mp-bar')!.style.width = `${mpPct}%`;
  document.getElementById('player-mp-text')!.textContent = `${cs.playerMp}/${cs.playerMaxMp}`;

  // 状态面板
  document.getElementById('status-hp-bar')!.style.width = `${playerHpPct}%`;
  document.getElementById('status-hp-text')!.textContent = `${cs.playerHp}/${cs.playerMaxHp}`;
  document.getElementById('status-mp-bar')!.style.width = `${mpPct}%`;
  document.getElementById('status-mp-text')!.textContent = `${cs.playerMp}/${cs.playerMaxMp}`;

  // HP 条颜色
  const hpBarClass = playerHpPct > 50 ? '' : playerHpPct > 25 ? 'medium' : 'low';
  ['player-hp-bar', 'status-hp-bar'].forEach(id => {
    const el = document.getElementById(id)!;
    el.className = `stat-bar-fill hp ${hpBarClass}`;
  });
  const enemyHpBarClass = enemyHpPct > 50 ? '' : enemyHpPct > 25 ? 'medium' : 'low';
  document.getElementById('enemy-hp-bar')!.className = `stat-bar-fill hp ${enemyHpBarClass}`;

  // 技能按钮
  const skillBtnIds = ['btn-skill1', 'btn-skill2', 'btn-skill3'];
  const cdIds = ['cd-skill1', 'cd-skill2', 'cd-skill3'];
  skills.forEach((skill, i) => {
    const btn = document.getElementById(skillBtnIds[i]);
    const cdEl = document.getElementById(cdIds[i]);
    if (!btn) return;

    btn.textContent = `${skill.icon} ${skill.name}`;
    const mpOk = run.playerMp >= skill.mpCost;
    const onCd = (run.skillCooldowns[skill.id] || 0) > 0;
    btn.disabled = !mpOk || onCd;

    if (cdEl) {
      if (onCd) {
        cdEl.textContent = `${run.skillCooldowns[skill.id]}`;
        cdEl.className = 'cooldown-item on-cooldown';
      } else {
        cdEl.textContent = '就绪';
        cdEl.className = 'cooldown-item ready';
      }
    }
  });

  // 战斗日志
  document.getElementById('battle-log')!.innerHTML = cs.log.map(l => {
    let cls = 'log-entry';
    if (l.includes('伤害')) cls += ' damage';
    else if (l.includes('恢复') || l.includes('吸取')) cls += ' heal';
    else if (l.includes('选择') || l.includes('免疫') || l.includes('抵挡')) cls += ' system';
    else cls += ' player-action';
    return `<div class="${cls}">${l}</div>`;
  }).join('');

  // 滚动到底部
  const logEl = document.getElementById('battle-log')!;
  logEl.scrollTop = logEl.scrollHeight;
}
```

- [ ] **更新 playerAttack 和 playerFlee 的回调**

将原来的 `playerAttack` 和 `playerFlee` 回调（`main.ts:197-202`）替换为：

```typescript
// Combat button controls
document.getElementById('btn-attack')!.addEventListener('click', () => {
  if (!dungeonRun || !dungeonRun.inCombat || !dungeonRun.combatState) return;
  playerAttack(dungeonRun);
  // sync state back
  dungeonRun.playerMp = dungeonRun.combatState.playerMp;
  dungeonRun.skillCooldowns = dungeonRun.combatState.skillCooldowns;
  dungeonRun.skillBuffs = dungeonRun.combatState.skillBuffs;
});

document.getElementById('btn-flee')!.addEventListener('click', () => {
  if (!dungeonRun || !dungeonRun.inCombat) return;
  playerFlee(dungeonRun);
});

// Skill button controls
['btn-skill1', 'btn-skill2', 'btn-skill3'].forEach((btnId, i) => {
  document.getElementById(btnId)!.addEventListener('click', () => {
    if (!dungeonRun) return;
    const playerClass = state.player.class;
    const skills = getSkillsForClass(playerClass);
    const skill = skills[i];
    if (!skill) return;
    useSkillById(dungeonRun, playerClass, skill.id);
  });
});
```

- [ ] **在 playerAttack 中添加 endTurn 调用**

修改 `dungeonView.ts` 中的 `playerAttack` 函数，添加 endTurn：

```typescript
export function playerAttack(run: DungeonRun): void {
  if (!run.combatState || !run.inCombat) return;
  executeCombatRound(run.combatState, 'attack');
  run.combatLog.push(...run.combatState.log);
  run.combatState.log = [];
  if (isCombatOver(run.combatState)) {
    resolveCombat(run);
  } else {
    endTurn(run.combatState);
    run.playerMp = run.combatState.playerMp;
    run.skillCooldowns = run.combatState.skillCooldowns;
  }
}
```

同样修改 `playerFlee`：

```typescript
export function playerFlee(run: DungeonRun): void {
  if (!run.combatState || !run.inCombat) return;
  executeCombatRound(run.combatState, 'flee');
  run.combatLog.push(...run.combatState.log);
  run.combatState.log = [];
  if (isCombatOver(run.combatState)) {
    resolveCombat(run);
  }
}
```

在 `dungeonView.ts` 顶部添加 import：

```typescript
import { endTurn } from './combat.js';
```

- [ ] **运行全部测试**

Run: `npx vitest run -v`
Expected: All tests PASS

- [ ] **提交**

```bash
git add src/main.ts src/roguelike/dungeonView.ts
git commit -m "feat: integrate battle UI with skill buttons and combat rendering"
```

---

## Task 8: 端到端测试

- [x] **运行全部测试**

Run: `npx vitest run -v`
Result: 178/179 PASS (1 pre-existing failure in planets.test.ts — English vs Chinese name, out of scope)

- [x] **运行构建检查**

Run: `npm run build`
Result: Build succeeds with no errors

- [x] **手动测试流程**（需要启动 dev server）

1. `npm run dev`
2. 进入星图，选择一个星球开始远征
3. 验证 Canvas 地牢正确显示（不再 0x0）
4. 移动到敌人触发战斗
5. 验证战斗界面显示：敌方/我方精灵、HP/MP 条、技能按钮
6. 测试普通攻击 — 验证伤害和反击
7. 测试技能使用 — 验证 MP 消耗、冷却、buff 效果
8. 测试 MP 不够时技能按钮禁用
9. 测试冷却中技能按钮禁用
10. 验证战斗结束（击杀/死亡/撤退）正确处理
11. 验证战斗结束后返回地牢探索

- [x] **最终提交**

```bash
git add -A
git commit -m "feat: complete combat system implementation with skills, MP, and battle UI"
```

---

## 依赖关系

```
Task 1 (修复测试 + 技能核心)
    ↓
Task 2 (扩展状态) ← 需要 Task 1
    ↓
Task 3 (技能执行) ← 需要 Task 1, 2
    ↓
Task 4 (Canvas 修复) ← 独立，可并行
    ↓
Task 5, 6 (HTML/CSS) ← 可并行
    ↓
Task 7 (主程序集成) ← 需要 Task 1-6
    ↓
Task 8 (端到端测试) ← 需要 Task 1-7
```

**并行机会:** Task 4 可以和 Task 1-3 并行执行。Task 5 和 Task 6 可以并行执行。
