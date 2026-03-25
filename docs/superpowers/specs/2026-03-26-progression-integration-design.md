# 进度感整合设计：基地建设 × 星图探索 × 远征系统

**日期**: 2026-03-26
**状态**: 已批准（经审查修订）
**范围**: 第一阶段 — 修复关键缺口，打通系统循环

## 背景

当前 Deep Sky 的三个核心玩法（基地建设、星图探索、远征）彼此孤立：
- 基地生产资源，但资源没有明确消耗出口
- 星图展示星球，但远征没有成长反馈
- 远征给予经验和战利品，但经验不触发升级，战利品只是列表展示

本设计修复四个关键缺口，让玩家感受到持续进步。

---

## 1. 升级系统

### 1.1 经验阈值公式

```
levelUpExp(level) = floor(100 * level ^ 1.5)
```

返回从 `level` 升到 `level + 1` 所需的 EXP（非累计）。

| 等级 | 所需经验 | 累计经验 |
|------|---------|---------|
| 1→2 | 100 | 100 |
| 2→3 | 283 | 383 |
| 3→4 | 520 | 903 |
| 5→6 | 1,118 | 2,530 |
| 10→11 | 3,162 | 10,000 |

### 1.2 属性计算（替换现有公式）

**替换** `expeditionEngine.ts:37-39` 中的硬编码属性计算，改为调用统一的 `getPlayerStats()` 函数：

```typescript
// 当前（将被替换）：
const baseHp = 100 + playerLevel * 10 + (classDef?.hpBonus ?? 0);
const baseAttack = 10 + playerLevel * 2 + (classDef?.attackBonus ?? 0);
const baseDefense = 3 + playerLevel + (classDef?.defenseBonus ?? 0);

// 替换为：
const stats = getPlayerStats(state.player.level, state.player.class, state.techUnlocked);
```

`getPlayerStats()` 在 `src/expedition/expeditionEngine.ts` 中定义（或提取到 `src/player/` 中）：

```typescript
function getPlayerStats(
  level: number,
  classId: string,
  techUnlocked: string[],
): { maxHp: number; maxMp: number; attack: number; defense: number } {
  const classDef = getClassDef(classId);

  // 基础属性 = 等级1属性 + 等级成长
  const maxHp = 100 + level * 10 + (classDef?.hpBonus ?? 0);
  const maxMp = 50 + level * 5;            // MP 仅在远征内有效，不持久化
  const attack = 10 + level * 2 + (classDef?.attackBonus ?? 0);
  const defense = 3 + level + (classDef?.defenseBonus ?? 0);

  // 叠加科技战斗加成（flat stats，来自 TechDef.effect.combatBonus）
  const combatBonus = getTechCombatBonus(techUnlocked);

  return {
    maxHp: maxHp + getMilestoneBonus(level, 'expeditionHp'),
    maxMp,
    attack: attack + combatBonus.attack,
    defense: defense + combatBonus.defense,
  };
}
```

### 1.3 升级与多级连升

`GameState.addExp(amount)` 需处理一次获得大量 EXP 导致多级连升的情况：

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

这样即使跳过里程碑等级（如 4→6），也能正确触发 level 5 里程碑。

### 1.4 里程碑奖励（每5级）

```typescript
interface MilestoneBonuses {
  productionMultiplier: number;   // 累计，如 1.265 at level 20
  expeditionHpBonus: number;      // flat HP bonus
  extraBuildingSlots: number;     // 额外建筑槽位
}
```

| 等级 | 奖励 |
|------|------|
| 5 | 资源产量 ×1.10 |
| 10 | 远征HP +20（flat） |
| 15 | 建筑槽位上限 +1 |
| 20 | 资源产量 ×1.265（累计） |

里程碑不修改 GameState 字段，作为等级查询函数的一部分计算返回。

### 1.5 EventBus 事件

`levelUp` 事件 payload：

```typescript
eventBus.emit('levelUp', newLevel: number, milestone: MilestoneBonuses);
```

订阅方（idleView）根据 payload 决定通知内容（普通升级 / 里程碑达成）。

### 1.6 修改文件

- `src/game/gameState.ts`: 添加 `addExp(amount)` 方法（返回升了几级）
- `src/expedition/expeditionEngine.ts`: 新增 `getPlayerStats()`，替换现有硬编码属性
- `src/idle/idleView.ts`: 监听 `levelUp` 事件，显示通知

---

## 2. 星球首次远征奖励

### 2.1 机制

每个星球首次远征成功时，给予一次性额外奖励：
- 固定数值资源（参照 `planets.json` 中已有的 `rewards` 字段 ×3 倍）
- 一个该星球特色道具

利用已有的 `exploredPlanets: string[]` 字段追踪。

### 2.2 奖励定义

在 `src/data/planets.json` 中为每个星球添加 `firstReward` 字段，同时更新 `PlanetDef` 接口：

```json
{
  "id": "aridia",
  "name": "阿里迪亚主星",
  "firstReward": {
    "resources": { "minerals": 200, "energy": 100 },
    "itemId": "aridiaDataCore",
    "itemName": "阿里迪亚数据核心"
  }
}
```

为 5 个星球各定义一个 `firstReward`。道具 ID 不需要在 `items.json` 中预先定义——首次奖励道具直接加入玩家 equipment 数组，不做装备效果。

### 2.3 数据流

**首次奖励逻辑放在 `finishExpedition()`（main.ts）中**，因为 `settleExpedition()` 只接收 `Expedition` 对象，没有 `GameState` 访问权限：

```
finishExpedition(state):
  → settleExpedition(exp)  // 基础结算
  → 检查 state.exploredPlanets 不包含 exp.planetId
  → 若未包含：
    → 将 firstReward.resources 加到 settlement.resourcesGained
    → 将 firstReward.itemId 加到 settlement.loot
    → state.exploredPlanets.push(exp.planetId)
  → 应用 settlement 到 state（addResource, addExp, equipment.push）
```

### 2.4 修改文件

- `src/data/planets.json`: 每个星球添加 `firstReward`
- `src/starmap/planets.ts`: `PlanetDef` 接口添加 `firstReward?` 可选字段
- `src/main.ts`: `finishExpedition()` 中添加首次奖励逻辑
- `src/expedition/expeditionView.ts`: 结算界面显示"首次探索"标记

---

## 3. 远征结束后自动返回星图

### 3.1 行为

远征结算界面显示 3 秒后，自动切回星图视图。期间玩家可点击"返回"按钮提前返回。

### 3.2 实现位置与架构

`uiManager` 在 `init()` 中为局部变量，`finishExpedition()` 通过模块级变量 `gameState` 访问 state。参照 `startExpedition()` 中已有的模式（`startExpedition` 也独立创建 `createUIManager()`），在 `finishExpedition` 中同样直接创建 UI 管理器：

```typescript
function finishExpedition(state: GameState): void {
  const exp = state.activeExpedition;
  if (!exp) return;

  // ... 结算逻辑（含首次奖励）...

  showExpeditionResult(exp, settlement);
  state.activeExpedition = undefined;

  // 3秒后自动返回星图
  const autoReturnTimer = setTimeout(() => {
    returnToStarmap(state);
  }, 3000);

  // 手动提前返回（点击结算面板任意位置）
  document.getElementById('expedition-result')!.addEventListener('click', () => {
    clearTimeout(autoReturnTimer);
    returnToStarmap(state);
  }, { once: true });
}

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

注意：需更新导航按钮 active 状态和标题文字，与 `init()` 中导航按钮处理保持一致。

### 3.3 修改文件

- `src/main.ts`: `finishExpedition()` 添加 auto-return 逻辑，提取 `returnToStarmap()` 辅助函数
- `src/expedition/expeditionView.ts`: 结算界面文案提示（"点击任意位置或等待 3 秒后返回星图"）

---

## 4. 科技树效果实际生效

### 4.1 当前问题

科技解锁（`techUnlocked` 数组）只标记状态，不影响实际数值。现有 `tech.json` 已定义了效果结构：

- `buildingBonus`: `{ "mine": 0.5 }` — 特定建筑产出 ×1.5（加法，+50%）
- `combatBonus`: `{ "attack": 5 }` — flat 数值加成（+5 attack）
- `energyDiscount`: `0.25` — 能量消耗 ×0.75

### 4.2 设计：基于已有 effect 结构

创建 `src/tech/techEffects.ts`，**遍历已解锁科技读取 effect 结构**，不硬编码科技 ID：

```typescript
import { getTechDef } from './techTree.js';

/** 获取特定建筑的产出乘数（来自 buildingBonus 类科技） */
function getBuildingProductionBonus(
  buildingId: string,
  techUnlocked: string[],
): number {
  let bonus = 0;
  for (const techId of techUnlocked) {
    const def = getTechDef(techId);
    if (def?.effect?.buildingBonus?.[buildingId]) {
      bonus += def.effect.buildingBonus[buildingId];
    }
  }
  return bonus;  // 0.5 = +50% 产出
}

/** 获取战斗 flat 数值加成（来自 combatBonus 类科技） */
function getTechCombatBonus(techUnlocked: string[]): {
  attack: number;
  defense: number;
} {
  let attack = 0;
  let defense = 0;
  for (const techId of techUnlocked) {
    const def = getTechDef(techId);
    if (def?.effect?.combatBonus) {
      if (def.effect.combatBonus.attack) attack += def.effect.combatBonus.attack;
      if (def.effect.combatBonus.defense) defense += def.effect.combatBonus.defense;
    }
  }
  return { attack, defense };
}

/** 获取能量折扣（来自 energyDiscount 类科技） */
function getEnergyDiscount(techUnlocked: string[]): number {
  let discount = 0;
  for (const techId of techUnlocked) {
    const def = getTechDef(techId);
    if (def?.effect?.energyDiscount) {
      discount += def.effect.energyDiscount;
    }
  }
  return Math.min(discount, 0.75);  // 上限 75% 折扣
}
```

### 4.3 生效点

- **基地资源产出**: `GameLoop.tick()` 中，对每栋建筑产出应用 `1 + getBuildingProductionBonus(buildingId, state.techUnlocked)`。离线进度计算时，在循环开始前缓存乘数以避免重复计算。
- **远征战斗属性**: `createExpedition()` 通过 `getPlayerStats()` 调用 `getTechCombatBonus(state.techUnlocked)` 获取 flat 加成。
- **星图能量消耗**:
  - 显示折扣：`starMapView.ts` 中渲染星球时展示折扣后能量消耗
  - 实际扣除：`startExpedition()`（main.ts:89-91）中计算 `planet.energyCost * (1 - getEnergyDiscount(state.techUnlocked))`

### 4.4 修改文件

- `src/tech/techEffects.ts`（新建）: 三个效果计算函数
- `src/tech/techTree.ts`: 确认导出 `getTechDef(techId)` 函数
- `src/game/gameLoop.ts`: `tick()` 中每栋建筑产出乘以科技加成
- `src/expedition/expeditionEngine.ts`: `getPlayerStats()` 调用 `getTechCombatBonus()`
- `src/main.ts`: `startExpedition()` 中能量消耗应用折扣
- `src/starmap/starMapView.ts`: 显示折扣后能量消耗

---

## 设计原则

1. **进度感优先**: 每次远征结束都有明确的成长反馈（等级提升、属性变强、新装备）
2. **自然循环**: 基地挂机 → 积累资源 → 选择星球 → 远征 → 获得成长 → 回到星图
3. **最小改动**: 复用已有数据结构（`exploredPlanets`、`techUnlocked`），不新增持久化字段
4. **后向兼容**: 升级系统不影响已有存档，经验从 0 开始累计
5. **基于现有数据**: 科技效果从 `TechDef.effect` 结构派生，不硬编码科技 ID

## 不在本范围内

- 新星球/新敌人/新装备的具体数值
- 技能树扩展
- PVP 或排行榜
- 成就系统
