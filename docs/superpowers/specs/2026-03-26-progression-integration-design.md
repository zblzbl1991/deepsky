# 进度感整合设计：基地建设 × 星图探索 × 远征系统

**日期**: 2026-03-26
**状态**: 已批准
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

| 等级 | 所需经验 | 累计经验 |
|------|---------|---------|
| 1→2 | 100 | 100 |
| 2→3 | 283 | 383 |
| 3→4 | 520 | 903 |
| 5→6 | 1,118 | 2,530 |
| 10→11 | 3,162 | 10,000 |

### 1.2 每级属性增长

远征中使用的属性基于玩家等级自动计算：

```typescript
function getPlayerStats(level: number, classId: string): {
  maxHp: number; maxMp: number; attack: number; defense: number;
} {
  const base = CLASS_BASE_STATS[classId];  // 等级1的初始属性
  return {
    maxHp: base.maxHp + level * 12,
    maxMp: base.maxMp + level * 6,
    attack: base.attack + level * 3,
    defense: base.defense + level * 2,
  };
}
```

### 1.3 里程碑奖励（每5级）

| 等级 | 奖励 |
|------|------|
| 5 | 资源产量 +10%（永久，乘算） |
| 10 | 远征HP +20%（远征时应用） |
| 15 | 解锁第4个建筑槽位 |
| 20 | 资源产量再 +15%（累计 +26.5%） |

里程碑不直接修改 GameState 字段，而是作为等级查询函数的一部分返回。

### 1.4 数据流

```
远征成功 → settleExpedition 返回 expGained
  → GameState.addExp(expGained)
  → 检查是否达到升级阈值
  → 触发 EventBus 'levelUp' 事件
  → UI 显示等级提升通知
```

### 1.5 修改文件

- `src/game/gameState.ts`: 添加 `addExp(amount)` 方法、升级逻辑、`getMilestoneBonuses()` 方法
- `src/expedition/expeditionEngine.ts`: `createExpedition` 调用 `getPlayerStats` 获取属性
- `src/game/eventBus.ts`: 已有，无需修改
- `src/idle/idleView.ts`: 监听 `levelUp` 事件，显示通知

---

## 2. 星球首次远征奖励

### 2.1 机制

每个星球首次远征成功时，给予一次性额外奖励：
- 大量资源（比普通远征多 3-5 倍）
- 一个该星球特色的装备/道具

利用已有的 `exploredPlanets: string[]` 字段追踪。

### 2.2 奖励定义

在 `src/data/planets.json` 中为每个星球添加 `firstReward` 字段：

```json
{
  "id": "aridia",
  "name": "阿里迪亚主星",
  "firstReward": {
    "resources": { "minerals": 200, "energy": 100 },
    "itemId": "aridiaRelic",
    "itemName": "阿里迪亚数据核心"
  }
}
```

### 2.3 数据流

```
远征成功 → settleExpedition
  → 检查 exploredPlanets 是否包含 planetId
  → 若未包含：添加 firstReward 到结算
  → 将 planetId 加入 exploredPlanets
```

### 2.4 修改文件

- `src/data/planets.json`: 添加 `firstReward` 字段
- `src/starmap/planets.ts`: 导出类型和获取函数
- `src/expedition/expeditionEngine.ts`: `settleExpedition` 整合首次奖励
- `src/expedition/expeditionView.ts`: 结算界面显示首次奖励标记

---

## 3. 远征结束后自动返回星图

### 3.1 行为

远征结算界面显示 3 秒后，自动切回星图视图。期间玩家可手动点击提前返回。

### 3.2 实现

在 `src/main.ts` 的 `finishExpedition()` 中：

```typescript
const autoReturnTimer = setTimeout(() => {
  uiManager.showView('starmap');
  renderStarMap(state);
}, 3000);

// 手动提前返回
resultEl.addEventListener('click', () => {
  clearTimeout(autoReturnTimer);
  uiManager.showView('starmap');
  renderStarMap(state);
}, { once: true });
```

### 3.3 修改文件

- `src/main.ts`: `finishExpedition` 函数
- `src/expedition/expeditionView.ts`: 结算界面文案提示（"3秒后返回星图"）

---

## 4. 科技树效果实际生效

### 4.1 当前问题

科技解锁（`techUnlocked` 数组）只标记状态，不影响实际数值。

### 4.2 设计

在 `src/tech/techTree.ts`（或创建 `src/tech/techEffects.ts`）中，根据已解锁科技计算乘数：

```typescript
function getProductionMultiplier(state: GameState): number {
  let multiplier = 1.0;
  if (state.techUnlocked.includes('advancedMining')) multiplier += 0.2;
  if (state.techUnlocked.includes('automatedRefinery')) multiplier += 0.3;
  // ...
  return multiplier;
}

function getCombatBonus(state: GameState): {
  attackMultiplier: number;
  defenseMultiplier: number;
  hpMultiplier: number;
} {
  // 根据已解锁科技返回战斗加成
}
```

### 4.3 生效点

- **基地资源产出**: `GameLoop` 的 tick 中，产出 = 基础产出 × 科技乘数 × 等级里程碑乘数
- **远征战斗属性**: `createExpedition` 中，属性 = 基础属性 × 科技乘数 × 等级成长
- **星图能量消耗**: 部分科技降低航行能量成本

### 4.4 修改文件

- `src/tech/techEffects.ts`（新建）: 科技效果计算函数
- `src/game/gameLoop.ts`: 应用产出乘数
- `src/expedition/expeditionEngine.ts`: 应用战斗加成
- `src/starmap/starMapView.ts`: 应用能量折扣

---

## 设计原则

1. **进度感优先**: 每次远征结束都有明确的成长反馈（等级提升、属性变强、新装备）
2. **自然循环**: 基地挂机 → 积累资源 → 选择星球 → 远征 → 获得成长 → 回到星图
3. **最小改动**: 复用已有数据结构（`exploredPlanets`、`techUnlocked`），不新增持久化字段
4. **后向兼容**: 升级系统不影响已有存档，经验从 0 开始累计

## 不在本范围内

- 新星球/新敌人/新装备的具体数值
- 技能树扩展
- PVP 或排行榜
- 成就系统
