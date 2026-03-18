# 远征战斗系统实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现完整的宝可梦风格回合制战斗系统，包含 Canvas 修复、帝国军械库风格 UI、MP + 冷却技能系统

**Architecture:** 扩展现有 `combat.ts` 模块，新增 `skills.ts` 技能模块，修改 `dungeonView.ts` 战斗状态管理，更新 HTML/CSS 实现方案B布局

**Tech Stack:** TypeScript, Canvas 2D, HTML/CSS, Vitest

---

## 文件变更总览

| 文件 | 变更类型 | 职责 |
|------|----------|------|
| `src/roguelike/skills.ts` | 新增 | 技能定义、数据结构、执行逻辑 |
| `src/roguelike/combat.ts` | 修改 | 扩展支持技能效果、MP、冷却 |
| `src/roguelike/dungeonView.ts` | 修改 | 战斗状态新增 MP/冷却/buff 管理 |
| `src/main.ts` | 修改 | 修复 Canvas 初始化顺序、战斗界面集成 |
| `index.html` | 修改 | 方案B战斗界面 DOM 结构 |
| `src/styles/main.css` | 修改 | 方案B战斗界面样式 |
| `tests/roguelike/skills.test.ts` | 新增 | 技能系统单元测试 |
| `tests/roguelike/combat.test.ts` | 修改 | 战斗系统测试扩展 |

---

## Task 1: 技能系统核心

**Files:**
- Create: `src/roguelike/skills.ts`
- Test: `tests/roguelike/skills.test.ts`

- [ ] **Step 1: 创建技能定义文件**

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
  | { type: 'damage_Execute'; threshold: number; multiplier: number }
  | { type: 'buff'; buffType: 'defense_half' | 'next_attack_boost' | 'lifesteal'; value?: number; duration: number }
  | { type: 'heal'; percent: number }
  | { type: 'mp_restore'; amount: number }
  | { type: 'immunity' };

export interface SkillBuffs {
  nextAttackBoost?: number;   // 下次攻击加成 %
  nextAttackBoostHits?: number;  // 下次攻击加成的剩余次数（支持"下2次攻击"）
  defenseHalf?: boolean;     // 受伤减半
  immunity?: boolean;        // 免疫下一次
  lifestealHits?: number;   // 剩余吸血次数
}

export const CLASS_SKILLS: Record<string, SkillDef[]> = {
  spaceMarine: [
    { id: 'sm_charge', name: '猛攻', icon: '⚔', mpCost: 15, cooldown: 0, description: '造成 150% 攻击力伤害', effect: { type: 'damage', multiplier: 1.5 } },
    { id: 'sm_shield_wall', name: '盾墙', icon: '🛡', mpCost: 10, cooldown: 2, description: '本回合受伤减半', effect: { type: 'buff', buffType: 'defense_half', duration: 1 } },
    { id: 'sm_tactical', name: '战术指令', icon: '✨', mpCost: 20, cooldown: 3, description: '下次攻击 +50% 伤害', effect: { type: 'buff', buffType: 'next_attack_boost', value: 50, duration: 1 } },
  ],
  inquisitor: [
    { id: 'inq_purge', name: '净化之火', icon: '🔥', mpCost: 25, cooldown: 2, description: '180% 伤害，恶魔系敌人额外 +50%', effect: { type: 'damage', multiplier: 1.8, bonusVsTypes: ['chaos'], bonusMultiplier: 0.5 } },
    { id: 'inq_barrier', name: '精神壁垒', icon: '🧠', mpCost: 15, cooldown: 2, description: '免疫下一次攻击', effect: { type: 'immunity' } },
    { id: 'inq_judgment', name: '命运审判', icon: '⚖', mpCost: 35, cooldown: 4, description: '必定命中，200% 伤害', effect: { type: 'damage', multiplier: 2.0 } },
  ],
  techPriest: [
    { id: 'tp_overload', name: '过载激光', icon: '⚡', mpCost: 20, cooldown: 2, description: '130% 伤害 + 10 固定伤害', effect: { type: 'damage', multiplier: 1.3, fixedBonusDamage: 10 } },
    { id: 'tp_repair', name: '修复立场', icon: '🔧', mpCost: 15, cooldown: 3, description: '恢复 30% 最大生命值', effect: { type: 'heal', percent: 30 } },
    { id: 'tp_rage', name: '机器狂怒', icon: '🤖', mpCost: 15, cooldown: 2, description: '下2次攻击 +30%', effect: { type: 'buff', buffType: 'next_attack_boost', value: 30, duration: 2 } },
  ],
  commissar: [
    { id: 'com_execute', name: '处决射击', icon: '🎯', mpCost: 30, cooldown: 3, description: 'HP<30% 敌人 300% 伤害', effect: { type: 'damage_Execute', threshold: 0.3, multiplier: 3.0 } },
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

- [x] **Step 2: 验证 EnemyDef type 字段**（已存在于 entities.ts，跳过）

```typescript
// src/roguelike/entities.ts
export interface EnemyDef {
  id: string;
  name: string;
  type: string;  // 'ork' | 'tyranid' | 'chaos' | 'mechanicus' | 'imperial'
  hp: number;
  attack: number;
  defense: number;
  exp: number;
  minFloor: number;
  isBoss?: boolean;
}
```

- [x] **Step 3: 验证 enemies.json type 字段**（已存在于 enemies.json，跳过）

```json
[
  { "id": "grot", "name": "Grot", "type": "ork", "hp": 15, ... },
  { "id": "orkBoy", "name": "Ork Boy", "type": "ork", "hp": 30, ... },
  { "id": "gaunt", "name": "Termagant", "type": "tyranid", "hp": 20, ... },
  { "id": "genestealer", "name": "Genestealer", "type": "tyranid", "hp": 45, ... },
  { "id": "daemonette", "name": "Daemonette", "type": "chaos", "hp": 50, ... },
  { "id": "warboss", "name": "Warboss", "type": "ork", "hp": 100, ..., "isBoss": true },
  { "id": "hiveTyrant", "name": "Hive Tyrant", "type": "tyranid", "hp": 150, ..., "isBoss": true }
]
```

- [ ] **Step 4: 编写技能系统测试**

```typescript
// tests/roguelike/skills.test.ts
import { describe, it, expect } from 'vitest';
import { getSkillsForClass, getSkillDef } from '../../src/roguelike/skills';

describe('技能系统', () => {
  it('星际战士有3个技能', () => {
    const skills = getSkillsForClass('spaceMarine');
    expect(skills).toHaveLength(3);
  });

  it('可以获取具体技能定义', () => {
    const skill = getSkillDef('spaceMarine', 'sm_charge');
    expect(skill).toBeDefined();
    expect(skill!.mpCost).toBe(15);
    expect(skill!.cooldown).toBe(0);
  });

  it('审讯官技能有 bonusDamage 字段', () => {
    const skill = getSkillDef('inquisitor', 'inq_purge');
    expect(skill!.effect).toEqual({ type: 'damage', multiplier: 1.8, bonusDamage: 0.5 });
  });

  it('处决射击有 threshold', () => {
    const skill = getSkillDef('commissar', 'com_execute');
    expect(skill!.effect).toEqual({ type: 'damage_Execute', threshold: 0.3, multiplier: 3.0 });
  });
});
```

- [ ] **Step 5: 运行测试**

Run: `npx vitest run tests/roguelike/skills.test.ts`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/roguelike/skills.ts src/roguelike/entities.ts src/data/enemies.json tests/roguelike/skills.test.ts
git commit -m "feat: add skill system with 4 classes × 3 skills"
```

---

## Task 2: 扩展战斗状态 (DungeonRun)

**Files:**
- Modify: `src/roguelike/dungeonView.ts`
- Test: `tests/roguelike/combat.test.ts`

- [ ] **Step 1: 更新 DungeonRun 接口**

```typescript
// src/roguelike/dungeonView.ts

export interface SkillBuffs {
  nextAttackBoost?: number;
  defenseHalf?: boolean;
  immunity?: boolean;
  lifestealHits?: number;
}

export interface DungeonRun {
  dungeon: Dungeon;
  playerPos: [number, number];
  fog: FogState[][];
  playerHp: number;
  playerMaxHp: number;
  playerAttack: number;
  playerDefense: number;
  playerMp: number;           // 新增
  playerMaxMp: number;        // 新增
  exp: number;
  loot: string[];
  currentFloor: number;
  maxFloors: number;
  inCombat: boolean;
  combatState: ReturnType<typeof createCombatState> | null;
  combatLog: string[];
  activeEnemies: { def: EnemyDef; x: number; y: number; hp: number; maxHp: number; isBoss?: boolean }[];
  activeItems: { id: string; x: number; y: number }[];
  gameOver: boolean;
  victory: boolean;
  skillCooldowns: Record<string, number>;  // 新增
  skillBuffs: SkillBuffs;                  // 新增
}
```

- [ ] **Step 2: 更新 startDungeonRun 初始化**

```typescript
export function startDungeonRun(state: GameState, _planetId: string, maxFloors: number): DungeonRun {
  const dungeon = generateDungeon(1, 1);
  return {
    dungeon,
    playerPos: [...dungeon.startPos],
    fog: createFogMap(dungeon.width, dungeon.height),
    playerHp: 100 + state.player.level * 10,
    playerMaxHp: 100 + state.player.level * 10,
    playerAttack: 10 + state.player.level * 2,
    playerDefense: 3 + state.player.level,
    playerMp: 50,        // 新增
    playerMaxMp: 50,     // 新增
    exp: 0,
    loot: [],
    currentFloor: 1,
    maxFloors,
    inCombat: false,
    combatState: null,
    combatLog: [],
    activeEnemies: [],
    activeItems: [],
    gameOver: false,
    victory: false,
    skillCooldowns: {},  // 新增
    skillBuffs: {},       // 新增
  };
}
```

- [ ] **Step 3: 新增 enterCombat 初始化冷却**

```typescript
export function enterCombat(run: DungeonRun, enemy: { def: EnemyDef; x: number; y: number; hp: number; maxHp: number; isBoss?: boolean }): void {
  run.inCombat = true;
  run.combatState = createCombatState(run.playerHp, run.playerMp, run.playerAttack, run.playerDefense, enemy.def);
  run.combatLog = [];
  // 重置技能冷却状态
  run.skillCooldowns = {};
  run.skillBuffs = {};
}
```

- [ ] **Step 4: 编写测试**

```typescript
// tests/roguelike/combat.test.ts 新增
it('DungeonRun 包含 MP 和冷却字段', () => {
  // 需要先创建 GameState...
});
```

- [ ] **Step 5: 运行测试**

Run: `npx vitest run tests/roguelike/combat.test.ts`

- [ ] **Step 6: 提交**

```bash
git add src/roguelike/dungeonView.ts tests/roguelike/combat.test.ts
git commit -m "feat: add MP, cooldown, buff fields to DungeonRun"
```

---

## Task 3: 扩展 combat.ts 支持技能

**Files:**
- Modify: `src/roguelike/combat.ts`
- Test: `tests/roguelike/combat.test.ts`

- [ ] **Step 1: 更新 CombatState 接口**

```typescript
// src/roguelike/combat.ts
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
  // 技能相关
  skillCooldowns: Record<string, number>;
  skillBuffs: SkillBuffs;
  lastSkillUsed?: string;
}
```

- [ ] **Step 2: 修改 createCombatState**

```typescript
export function createCombatState(
  playerHp: number, playerMp: number, playerAttack: number, playerDefense: number, enemy: EnemyDef
): CombatState {
  return {
    playerHp, playerMaxHp: playerHp,
    playerMp, playerMaxMp: playerMp,
    playerAttack, playerDefense,
    enemy: { ...enemy },
    enemyHp: enemy.hp, enemyMaxHp: enemy.hp,
    fled: false, log: [],
    skillCooldowns: {},
    skillBuffs: {},
  };
}
```

- [ ] **Step 3: 新增 useSkill 函数**

```typescript
export function useSkill(
  state: CombatState,
  skill: SkillDef,
  classId: string
): { success: boolean; message: string } {
  // 检查 MP
  if (state.playerMp < skill.mpCost) {
    return { success: false, message: `MP 不足，需要 ${skill.mpCost} MP` };
  }
  // 检查冷却
  if ((state.skillCooldowns[skill.id] || 0) > 0) {
    return { success: false, message: `${skill.name} 还在冷却中` };
  }

  // 消耗 MP
  state.playerMp -= skill.mpCost;
  // 设置冷却
  state.skillCooldowns[skill.id] = skill.cooldown;
  state.lastSkillUsed = skill.id;

  // 执行技能效果
  switch (skill.effect.type) {
    case 'damage': {
      const multiplier = skill.effect.multiplier;
      let bonusMultiplier = 0;
      // 检查对特定类型敌人的额外伤害（如 inq_purge 对 chaos）
      if (skill.effect.bonusVsTypes?.includes(state.enemy.type)) {
        bonusMultiplier = skill.effect.bonusMultiplier || 0;
      }
      const baseDmg = calcDamage(state.playerAttack, state.enemy.defense, multiplier);
      // 固定伤害加成（如 tp_overload 的 +10）
      const fixedBonus = skill.effect.fixedBonusDamage || 0;
      const totalDmg = Math.floor(baseDmg * (1 + bonusMultiplier)) + fixedBonus;
      state.enemyHp = Math.max(0, state.enemyHp - totalDmg);
      state.log.push(`${skill.icon} ${skill.name}！对 ${state.enemy.name} 造成了 ${totalDmg} 点伤害！`);
      break;
    }
    case 'damage_Execute': {
      const threshold = skill.effect.threshold;
      const multiplier = state.enemyHp / state.enemyMaxHp < threshold
        ? skill.effect.multiplier
        : 1.0;
      const dmg = calcDamage(state.playerAttack, state.enemy.defense, multiplier);
      state.enemyHp = Math.max(0, state.enemyHp - dmg);
      state.log.push(`${skill.icon} ${skill.name}！对 ${state.enemy.name} 造成了 ${dmg} 点伤害！`);
      break;
    }
    case 'buff': {
      const { buffType, value, duration } = skill.effect;
      switch (buffType) {
        case 'defense_half':
          state.skillBuffs.defenseHalf = true;
          state.log.push(`${skill.icon} ${skill.name}！举起盾牌，本回合受伤减半！`);
          break;
        case 'next_attack_boost':
          state.skillBuffs.nextAttackBoost = value;
          state.skillBuffs.nextAttackBoostHits = duration;  // 支持"下N次攻击"
          state.log.push(`${skill.icon} ${skill.name}！接下来 ${duration} 次攻击伤害 +${value}%！`);
          break;
        case 'lifesteal':
          state.skillBuffs.lifestealHits = (state.skillBuffs.lifestealHits || 0) + duration;
          state.log.push(`${skill.icon} ${skill.name}！接下来 ${duration} 次攻击吸取生命！`);
          break;
      }
      break;
    }
    case 'immunity':
      state.skillBuffs.immunity = true;
      state.log.push(`${skill.icon} ${skill.name}！形成精神屏障，免疫下一次攻击！`);
      break;
    case 'heal': {
      const healAmount = Math.floor(state.playerMaxHp * (skill.effect.percent / 100));
      state.playerHp = Math.min(state.playerMaxHp, state.playerHp + healAmount);
      state.log.push(`${skill.icon} ${skill.name}！恢复了 ${healAmount} 点生命！`);
      break;
    }
    case 'mp_restore': {
      const restoreAmount = Math.min(skill.effect.amount, state.playerMaxMp - state.playerMp);
      state.playerMp = Math.min(state.playerMaxMp, state.playerMp + restoreAmount);
      state.log.push(`${skill.icon} ${skill.name}！恢复了 ${restoreAmount} 点 MP！`);
      break;
    }
  }

  return { success: true, message: '' };
}
```

- [ ] **Step 4: 修改 executeCombatRound 处理技能效果**

原有的 `executeCombatRound` 需要整合技能 buffs：

```typescript
export function executeCombatRound(state: CombatState, action: 'attack' | 'flee' | string, skill?: SkillDef): void {
  // ... 现有逻辑 ...

  // 攻击时应用 nextAttackBoost
  if (action === 'attack' && state.skillBuffs.nextAttackBoost) {
    const boost = state.skillBuffs.nextAttackBoost;
    state.skillBuffs.nextAttackBoost = undefined;
    // 需要在伤害计算中使用 boost
  }

  // 受伤时检查 defenseHalf
  if (state.skillBuffs.defenseHalf) {
    finalDmg = Math.floor(finalDmg / 2);
    state.skillBuffs.defenseHalf = false;
  }

  // 受伤时检查 immunity
  if (state.skillBuffs.immunity) {
    state.skillBuffs.immunity = false;
    state.log.push('精神壁垒抵挡了攻击！');
    return;
  }
}
```

- [ ] **Step 5: 新增 endTurn 函数处理回合结算**

```typescript
export function endTurn(state: CombatState): void {
  // MP 恢复
  state.playerMp = Math.min(state.playerMaxMp, state.playerMp + 10);
  // 冷却减少
  for (const skillId in state.skillCooldowns) {
    if (state.skillCooldowns[skillId] > 0) {
      state.skillCooldowns[skillId]--;
    }
  }
  // Buff 减少
  if (state.skillBuffs.defenseHalf) state.skillBuffs.defenseHalf = false;
  if (state.skillBuffs.lifestealHits !== undefined) {
    state.skillBuffs.lifestealHits--;
    if (state.skillBuffs.lifestealHits <= 0) state.skillBuffs.lifestealHits = undefined;
  }
}
```

- [ ] **Step 6: 编写测试**

```typescript
// tests/roguelike/combat.test.ts
it('使用技能消耗 MP', () => {
  const state = createCombatState(100, 50, 20, 5, enemies[0]);
  const skill = getSkillDef('spaceMarine', 'sm_charge')!;
  const result = useSkill(state, skill, 'spaceMarine');
  expect(result.success).toBe(true);
  expect(state.playerMp).toBe(35); // 50 - 15
});
```

- [ ] **Step 7: 运行测试**

Run: `npx vitest run tests/roguelike/combat.test.ts`

- [ ] **Step 8: 提交**

```bash
git add src/roguelike/combat.ts tests/roguelike/combat.test.ts
git commit -m "feat: extend combat system with skill support"
```

---

## Task 4: Canvas 修复

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: 修复 canvas 初始化顺序**

```typescript
// src/main.ts 中 onPlanetSelect 回调函数
// 找到这段代码：
const canvas = document.getElementById('dungeon-canvas') as HTMLCanvasElement;
const container = document.getElementById('dungeon-container')!;
const w = Math.min(container.clientWidth, 640);
canvas.width = w;
canvas.height = Math.floor(w * 0.75);

// 修改为：
ui.showView('dungeon');  // 先显示 view
const canvas = document.getElementById('dungeon-canvas') as HTMLCanvasElement;
const container = document.getElementById('dungeon-container')!;
const w = Math.min(container.clientWidth, 640);
canvas.width = w;
canvas.height = Math.floor(w * 0.75);
```

- [ ] **Step 2: 提交**

```bash
git add src/main.ts
git commit -m "fix: canvas size calculation after view becomes visible"
```

---

## Task 5: HTML 战斗界面

**Files:**
- Modify: `index.html`

- [ ] **Step 1: 更新战斗界面 DOM 结构**

将 `#view-dungeon` 内的内容替换为：

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
    <!-- 战斗头部 -->
    <div class="battle-header">
      <span class="battle-title">⚔ 遭遇战斗</span>
      <span class="floor-indicator" id="battle-floor">第 I 层</span>
    </div>

    <!-- 战斗场景 -->
    <div class="battle-arena">
      <!-- 左侧：敌人 -->
      <div class="combatant enemy">
        <div class="sprite-box" id="enemy-sprite">👹</div>
        <div class="combatant-info">
          <div class="combatant-name" id="enemy-name">敌人名称</div>
          <div class="stat-bar">
            <span class="stat-label">HP</span>
            <div class="stat-bar-bg">
              <div class="stat-bar-fill hp" id="enemy-hp-bar"></div>
            </div>
            <span class="stat-value" id="enemy-hp-text">100/100</span>
          </div>
        </div>
      </div>

      <!-- 右侧：我方 -->
      <div class="combatant player">
        <div class="sprite-box" id="player-sprite">⚔</div>
        <div class="combatant-info">
          <div class="combatant-name" id="player-battle-name">星际战士</div>
          <div class="stat-bar">
            <span class="stat-label">HP</span>
            <div class="stat-bar-bg">
              <div class="stat-bar-fill hp" id="player-hp-bar"></div>
            </div>
            <span class="stat-value" id="player-hp-text">100/100</span>
          </div>
          <div class="stat-bar">
            <span class="stat-label">MP</span>
            <div class="stat-bar-bg mp">
              <div class="stat-bar-fill mp" id="player-mp-bar"></div>
            </div>
            <span class="stat-value" id="player-mp-text">50/50</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 战斗面板 -->
    <div class="battle-panel">
      <div class="panel-section">
        <div class="panel-title">▸ 战斗指令</div>
        <div class="actions" id="battle-actions">
          <button class="action-btn attack" id="btn-attack">⚔ 攻击</button>
          <button class="action-btn skill" id="btn-skill1">✨ -</button>
          <button class="action-btn skill" id="btn-skill2">🛡 -</button>
          <button class="action-btn skill" id="btn-skill3">✨ -</button>
        </div>
      </div>
      <div class="panel-section">
        <div class="panel-title">▸ 角色状态</div>
        <div class="player-status-brief">
          <div class="stat-bar">
            <span class="stat-label">HP</span>
            <div class="stat-bar-bg"><div class="stat-bar-fill hp" id="status-hp-bar"></div></div>
            <span class="stat-value" id="status-hp-text">100/100</span>
          </div>
          <div class="stat-bar">
            <span class="stat-label">MP</span>
            <div class="stat-bar-bg mp"><div class="stat-bar-fill mp" id="status-mp-bar"></div></div>
            <span class="stat-value" id="status-mp-text">50/50</span>
          </div>
        </div>
        <div class="skill-cooldowns" id="skill-cooldowns">
          <span class="cooldown-label">冷却:</span>
          <span id="cd-skill1" class="cooldown-item">-</span>
          <span id="cd-skill2" class="cooldown-item">-</span>
          <span id="cd-skill3" class="cooldown-item">-</span>
        </div>
      </div>
      <div class="panel-section combat-log">
        <div class="panel-title">▸ 战斗记录</div>
        <div class="log-entries" id="battle-log">
          <div class="log-entry">选择你的行动...</div>
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

- [ ] **Step 2: 提交**

```bash
git add index.html
git commit -m "feat: add Plan B battle UI layout"
```

---

## Task 6: CSS 战斗样式

**Files:**
- Modify: `src/styles/main.css`

- [ ] **Step 1: 添加战斗界面样式**

在 CSS 文件末尾添加：

```css
/* ============================================================
   9b. BATTLE VIEW — Imperial Arsenal Style
   ============================================================ */

/* 战斗头部 */
.battle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--surface-2);
  border: 1px solid var(--border-dim);
  border-left: 3px solid var(--gold-40);
  margin-bottom: var(--space-3);
}

.battle-title {
  font-family: var(--font-display);
  font-size: 0.85rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--gold-30);
}

.floor-indicator {
  font-family: var(--font-display);
  font-size: 0.7rem;
  color: var(--gold-50);
  border: 1px solid var(--gold-60);
  padding: 0.2rem 0.5rem;
}

/* 战斗场景 */
.battle-arena {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--atmosphere-void);
  border: 1px solid var(--border-dim);
  border-top: 3px solid var(--gold-50);
  padding: 1.5rem 2rem;
  margin-bottom: var(--space-3);
  min-height: 160px;
}

.combatant {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
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
  background: rgba(10,10,15,0.7);
  border: 2px solid;
  position: relative;
}

.combatant.enemy .sprite-box {
  border-color: var(--red-40);
  box-shadow: 0 0 20px rgba(200,60,60,0.3);
}

.combatant.player .sprite-box {
  border-color: var(--gold-40);
  box-shadow: 0 0 20px rgba(200,160,60,0.3);
}

.combatant-info {
  text-align: center;
  min-width: 140px;
}

.combatant.enemy .combatant-info { text-align: left; }
.combatant.player .combatant-info { text-align: right; }

.combatant-name {
  font-family: var(--font-display);
  font-size: 0.8rem;
  color: var(--gold-20);
  margin-bottom: 0.4rem;
  letter-spacing: 0.1em;
}

/* 状态条 */
.stat-bar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.65rem;
  color: var(--gold-50);
  width: 20px;
  text-align: right;
}

.stat-bar-bg {
  flex: 1;
  height: 8px;
  background: var(--surface-3);
  border: 1px solid var(--surface-5);
  position: relative;
  overflow: hidden;
}

.stat-bar-bg.mp {
  border-color: var(--blue-40);
}

.stat-bar-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.stat-bar-fill.hp {
  background: linear-gradient(90deg, #4a2, #6c4);
}
.stat-bar-fill.hp.medium {
  background: linear-gradient(90deg, #a4, #c6);
}
.stat-bar-fill.hp.low {
  background: linear-gradient(90deg, #c42, #e64);
}

.stat-bar-fill.mp {
  background: linear-gradient(90deg, #24c, #48e);
}

.stat-value {
  font-size: 0.7rem;
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

.panel-section {
  background: var(--surface-2);
  border: 1px solid var(--border-dim);
  padding: 0.75rem;
}

.panel-title {
  font-family: var(--font-display);
  font-size: 0.65rem;
  color: var(--gold-50);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--border-dim);
}

/* 行动按钮 */
.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
}

.action-btn {
  background: transparent;
  border: 1px solid;
  padding: 0.5rem 0.75rem;
  font-family: var(--font-display);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.action-btn .icon { font-size: 1rem; }

.action-btn.attack {
  border-color: var(--red-40);
  color: var(--red-20);
}
.action-btn.attack:hover {
  background: var(--red-40);
  color: white;
}

.action-btn.skill {
  border-color: var(--gold-40);
  color: var(--gold-30);
}
.action-btn.skill:hover:not(:disabled) {
  background: var(--gold-50);
  color: var(--surface-1);
}
.action-btn.skill:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-btn.item {
  border-color: #6a4;
  color: #8c6;
}
.action-btn.item:hover {
  background: #4a6;
  color: white;
}

.action-btn.flee {
  border-color: var(--gold-40);
  color: var(--gold-30);
}
.action-btn.flee:hover {
  background: var(--gold-50);
  color: var(--surface-1);
}

/* 角色状态面板 */
.player-status-brief {
  margin-bottom: 0.5rem;
}

/* 冷却显示 */
.skill-cooldowns {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.65rem;
  color: var(--gold-50);
  margin-top: 0.3rem;
}

.cooldown-label { font-family: var(--font-display); }

.cooldown-item {
  padding: 0.1rem 0.3rem;
  background: var(--surface-3);
  border: 1px solid var(--border-dim);
  font-variant-numeric: tabular-nums;
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
  font-size: 0.75rem;
  color: var(--gold-30);
  line-height: 1.6;
}

.log-entry {
  margin-bottom: 0.25rem;
}
.log-entry.damage { color: var(--red-20); }
.log-entry.heal { color: #8c6; }
.log-entry.system { color: var(--gold-50); font-style: italic; }
.log-entry.player-action { color: var(--gold-20); }

/* 地牢探索（战斗时隐藏） */
#dungeon-explore { display: block; }
#dungeon-explore.hidden { display: none; }
```

- [ ] **Step 2: 提交**

```bash
git add src/styles/main.css
git commit -m "style: add Plan B battle UI CSS"
```

---

## Task 7: 主程序集成

**Files:**
- Modify: `src/main.ts`
- Modify: `src/roguelike/dungeonView.ts`

- [ ] **Step 1: 更新 main.ts 事件处理**

```typescript
// src/main.ts

// 战斗按钮事件
document.getElementById('btn-attack')!.addEventListener('click', () => {
  if (dungeonRun && dungeonRun.inCombat) playerAttack(dungeonRun);
});

// 技能按钮事件（需要动态绑定技能）
function bindSkillButtons(run: DungeonRun) {
  const playerClass = state.player.classId; // 假设 GameState 有 classId
  const skills = getSkillsForClass(playerClass);

  ['btn-skill1', 'btn-skill2', 'btn-skill3'].forEach((btnId, i) => {
    const btn = document.getElementById(btnId);
    const skill = skills[i];
    if (!btn || !skill) return;

    btn.textContent = `${skill.icon} ${skill.name}`;
    btn.onclick = () => useSkillById(run, skill.id);
    updateSkillButtonState(btn, skill, run);
  });
}

function updateSkillButtonState(btn: HTMLElement, skill: SkillDef, run: DungeonRun) {
  const mpSufficient = run.playerMp >= skill.mpCost;
  const onCooldown = (run.skillCooldowns[skill.id] || 0) > 0;
  btn.disabled = !mpSufficient || onCooldown;
}
```

- [ ] **Step 2: 新增 useSkillById 辅助函数**

```typescript
// src/roguelike/dungeonView.ts
export function useSkillById(run: DungeonRun, skillId: string): void {
  if (!run.inCombat || !run.combatState) return;

  const playerClass = 'spaceMarine'; // 需要从 GameState 获取
  const skill = getSkillDef(playerClass, skillId);
  if (!skill) return;

  const result = useSkill(run.combatState, skill, playerClass);
  run.combatLog.push(...run.combatState.log);

  if (isCombatOver(run.combatState)) {
    resolveCombat(run);
  }
}
```

- [ ] **Step 3: 更新 renderDungeonView 渲染战斗界面**

```typescript
// src/main.ts 中
function renderDungeonView(): void {
  if (!dungeonRun) return;

  // 更新 HUD
  document.getElementById('dungeon-floor')!.textContent = `第 ${toRoman(dungeonRun.currentFloor)} 层`;
  document.getElementById('dungeon-hp')!.textContent = `生命: ${dungeonRun.playerHp} / ${dungeonRun.playerMaxHp}`;
  document.getElementById('dungeon-atk')!.textContent = `攻击: ${dungeonRun.playerAttack}`;
  document.getElementById('dungeon-def')!.textContent = `防御: ${dungeonRun.playerDefense}`;
  document.getElementById('dungeon-exp')!.textContent = `经验: ${dungeonRun.exp}`;

  // 切换战斗/探索界面
  const battleScreen = document.getElementById('battle-screen')!;
  const dungeonExplore = document.getElementById('dungeon-explore')!;

  if (dungeonRun.inCombat && dungeonRun.combatState) {
    battleScreen.style.display = 'block';
    dungeonExplore.classList.add('hidden');

    // 渲染战斗界面
    renderBattleUI(dungeonRun);
  } else {
    battleScreen.style.display = 'none';
    dungeonExplore.classList.remove('hidden');

    // 渲染地牢
    if (dungeonRenderer) {
      dungeonRenderer.renderDungeon(dungeonRun.dungeon, dungeonRun.fog, dungeonRun.playerPos, dungeonRun.activeEnemies, dungeonRun.activeItems);
    }
  }

  // ... 现有逻辑
}

function renderBattleUI(run: DungeonRun): void {
  const cs = run.combatState!;

  // 敌人信息
  document.getElementById('enemy-name')!.textContent = cs.enemy.name;
  document.getElementById('enemy-hp-bar')!.style.width = `${(cs.enemyHp / cs.enemyMaxHp) * 100}%`;
  document.getElementById('enemy-hp-text')!.textContent = `${cs.enemyHp}/${cs.enemyMaxHp}`;

  // 玩家信息
  document.getElementById('player-battle-name')!.textContent = '星际战士'; // 需要从 state 获取
  document.getElementById('player-hp-bar')!.style.width = `${(cs.playerHp / cs.playerMaxHp) * 100}%`;
  document.getElementById('player-hp-text')!.textContent = `${cs.playerHp}/${cs.playerMaxHp}`;
  document.getElementById('player-mp-bar')!.style.width = `${(cs.playerMp / cs.playerMaxMp) * 100}%`;
  document.getElementById('player-mp-text')!.textContent = `${cs.playerMp}/${cs.playerMaxMp}`;

  // 状态面板
  document.getElementById('status-hp-bar')!.style.width = `${(cs.playerHp / cs.playerMaxHp) * 100}%`;
  document.getElementById('status-hp-text')!.textContent = `${cs.playerHp}/${cs.playerMaxHp}`;
  document.getElementById('status-mp-bar')!.style.width = `${(cs.playerMp / cs.playerMaxMp) * 100}%`;
  document.getElementById('status-mp-text')!.textContent = `${cs.playerMp}/${cs.playerMaxMp}`;

  // 战斗日志
  document.getElementById('battle-log')!.innerHTML = cs.log.map(l => {
    let cls = 'log-entry';
    if (l.includes('伤害')) cls += ' damage';
    else if (l.includes('恢复')) cls += ' heal';
    else if (l.includes('选择')) cls += ' system';
    else cls += ' player-action';
    return `<div class="${cls}">${l}</div>`;
  }).join('');

  // 更新技能冷却显示
  updateCooldownDisplay(run);
}
```

- [ ] **Step 4: 提交**

```bash
git add src/main.ts src/roguelike/dungeonView.ts
git commit -m "feat: integrate battle UI with main game loop"
```

---

## Task 8: 端到端测试

**Files:**
- 测试整个战斗流程

- [ ] **Step 1: 运行所有测试**

Run: `npm run test`

- [ ] **Step 2: 手动测试流程**

1. 启动 `npm run dev`
2. 进入星图，选择一个星球开始远征
3. 验证 Canvas 地牢正确显示
4. 移动到敌人触发战斗
5. 验证战斗界面正确显示
6. 测试攻击、技能、撤退
7. 验证 MP 消耗和恢复
8. 验证冷却显示
9. 验证战斗结束后返回星图

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: complete battle system implementation"
```

---

## 依赖关系

```
Task 1 (技能核心)
    ↓
Task 2 (DungeonRun 扩展) ← 需要 Task 1
    ↓
Task 3 (combat.ts 扩展) ← 需要 Task 1, 2
    ↓
Task 4 (Canvas 修复) ← 独立
    ↓
Task 5, 6 (HTML/CSS) ← 可以并行
    ↓
Task 7 (主程序集成) ← 需要 Task 1-6
    ↓
Task 8 (端到端测试) ← 需要 Task 1-7
```

---

## 预计文件变更

- 新增: `src/roguelike/skills.ts`
- 新增: `tests/roguelike/skills.test.ts`
- 修改: `src/roguelike/combat.ts`
- 修改: `src/roguelike/dungeonView.ts`
- 修改: `src/main.ts`
- 修改: `index.html`
- 修改: `src/styles/main.css`
- 修改: `tests/roguelike/combat.test.ts`

---

## 补充说明

### 敌人 AI 简化

本计划**不实现**敌人的专属技能。敌人只使用基础攻击（普通攻击），符合现有 `calcDamage` 逻辑。未来可扩展敌人技能系统。

### createCombatState 签名变更

本计划会将 `createCombatState` 的签名从 4 参数扩展为 5 参数（新增 `playerMp`）。这是 Breaking Change，调用处需要同步更新。
