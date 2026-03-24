# 远征系统设计规格

> 状态：已批准
> 日期：2026-03-24
> 替代：地牢探索系统（Canvas 地图 + 手动战斗）

## 概述

将现有地牢探索系统（Canvas 2D 手动地图 + 回合制手动战斗）完全替换为**挂机式自动远征系统**。玩家在星图选择星球发起远征，事件按固定间隔自动推进，战斗全自动可视化播放，全程无需玩家操作。

## 远征流程

```
玩家在星图选择已探索星球 → 选择远征难度 → 点击"派遣远征"
→ 预生成事件序列 → 固定间隔推进事件
→ 遇到战斗 → 弹出自动战斗面板（可视化播放）
→ 战斗结束 → 继续日志 → 全部事件完成或死亡
→ 结算奖励 → 写入 GameState → 远征面板关闭
```

- 同一时间只能有一支远征队
- 远征进行中：星球图标显示"远征中"标记，点击可查看进度
- 旧存档的 `dungeonRun` 字段加载时忽略，不迁移

## 数据模型

### Expedition

```typescript
interface Expedition {
  id: string;
  planetId: string;
  difficulty: 1 | 2 | 3;
  status: 'pending' | 'active' | 'success' | 'failed';
  currentEventIndex: number;
  events: ExpeditionEvent[];
  player: ExpeditionPlayer;
  loot: LootItem[];
  expGained: number;
  startTime: number;
}

interface ExpeditionPlayer {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  classId: string;
}
```

### 事件类型（tagged union）

```typescript
type ExpeditionEvent =
  | { type: 'combat'; enemy: EnemyData; result?: CombatResult }
  | { type: 'loot'; item: ItemData; description: string }
  | { type: 'explore'; description: string; outcome: ExploreOutcome }
  | { type: 'encounter'; description: string; effect: EncounterEffect };

interface CombatResult {
  victory: boolean;
  turnsUsed: number;
  hpRemaining: number;
  damageDealt: number;
  damageReceived: number;
  log: string[];
}

interface ExploreOutcome {
  success: boolean;
  reward?: { type: 'exp' | 'resource' | 'buff'; value: number };
  damage?: number;
}

interface EncounterEffect {
  type: 'heal_hp' | 'heal_mp' | 'buff' | 'exp';
  value: number;
  description: string;
}
```

### SaveData 变更

```typescript
// 新增
activeExpedition?: Expedition;

// 删除
dungeonRun?: DungeonRun;
```

## 事件系统

### 生成规则

远征开始时一次性预生成整条事件序列。

| 难度 | 事件数 | 敌人强度系数 |
|------|--------|-------------|
| 1（低） | 8 | 0.8x |
| 2（中） | 11 | 1.0x |
| 3（高） | 14 | 1.3x |

分布约束：
- 战斗事件占 ~40%
- 第 1 个事件绝不战斗
- 最后一个事件为 BOSS 战斗（高难度才有 BOSS，低难度为普通战斗）
- 战斗间隔不超过 2 个非战斗事件

### 事件类型

**1. 战斗事件（combat）**
- 从敌人库按难度筛选，匹配玩家等级
- 战斗全自动，AI 选技能/攻击
- 技能选择：有处决技能且敌人 HP<30% → 优先；有治疗/防御且玩家 HP<40% → 优先；否则选伤害最高；无可用技能则普攻
- 记录战斗结果：回合数、剩余 HP、伤害统计

**2. 资源/道具发现（loot）**
- 描述如"在废墟中发现了一个弹药箱"
- 资源直接写入 GameState，道具进入远征战利品

**3. 探索事件（explore）**
- 描述如"前方是一条漆黑的走廊，远处传来低沉的嗡鸣声"
- 自动判定结果（玩家属性 + 随机因子）：成功获得经验/资源/Buff，失败受少量伤害

**4. 遭遇事件（encounter）**
- 描述如"你遇到了一群难民"、"一台损坏的伺服颅骨在墙角闪烁"
- 自动产生效果：治愈（恢复 HP/MP）、Buff（临时战斗加成）、信息（获得经验）
- 从 `src/data/expeditionEvents.json` 事件池随机抽取

### 事件推进节奏

- 事件间固定 4 秒间隔
- 战斗事件弹出战斗面板时暂停日志推进，战斗结束后恢复

## 自动战斗

### 回合流程

每回合固定 1.2 秒推进：

```
播放玩家行动（0.5s 攻击动画 + 伤害数字）
→ 检查敌人死亡 → 是：胜利
→ 播放敌人行动（0.5s 攻击动画 + 伤害数字）
→ 检查玩家死亡 → 是：远征失败
→ 回合结束（MP +10、CD -1）
```

### 技能自动选择逻辑

```
1. 筛选可用技能（MP 够、CD 就绪）
2. 敌人 HP < 30% 且有处决技能 → 使用
3. 玩家 HP < 40% 且有治疗/防御技能 → 使用
4. 否则选伤害最高的技能
5. 无可用技能 → 普攻
```

### 伤害公式

保留现有公式不变：

```
base = max(1, attack - defense)
randomized = base + random(-1, +1)
final = max(1, floor(randomized * multiplier))
```

## 战斗面板 UI

复用 Plan B 布局，去掉所有操作按钮：

```
┌─────────────────────────────────────────────┐
│  ⚔ 遭遇战斗            远征第 3/11 个事件   │
├─────────────────────────────────────────────┤
│  ┌──────────┐          ┌──────────┐         │
│  │ 敌人     │          │ 玩家     │         │
│  │ HP 条    │   VS     │ HP 条    │         │
│  │ HP 数值  │          │ HP/MP 数值│         │
│  └──────────┘          └──────────┘         │
├─────────────────────────────────────────────┤
│  > 战斗日志（自动滚动）                      │
│    伤害红色、治疗绿色、技能金色               │
└─────────────────────────────────────────────┘
```

- 攻击时数字弹出动画（从角色位置浮起消失）
- HP 条颜色：绿 >50%、黄 25-50%、红 <25%

## 远征面板 UI

```
┌──────────────────────────────────────────────┐
│  🪐 星球远征                  进行中 ●       │
│  难度：中等  │  进度：3/11  │  HP ██████░░   │
├──────────────────────────────────────────────┤
│  ▼ 事件 1：探索事件（已完成，折叠）            │
│  ▼ 事件 2：战斗事件（已完成，折叠）            │
│  ▸ 事件 3：遭遇事件 ← 当前事件               │
│  ○ 事件 4 ~ 11（未触发，灰显）               │
├──────────────────────────────────────────────┤
│  已收集：链锯剑、能量电池x2    经验 +27       │
└──────────────────────────────────────────────┘
```

- 已完成事件折叠显示（▼），当前事件展开高亮（▸），未触发灰显（○）
- 底部战利品栏：已收集物品 + 累计经验

## 星图集成

- 选择已探索星球 → 弹出远征配置面板（难度选择、预估奖励）→ "派遣远征"
- 远征进行中：星球显示"远征中"标记，点击打开远征面板
- 远征面板作为星图子视图（overlay），不替换星图

## 失败与结算

### 死亡返回

- HP 归零即远征失败
- 损失已收集战利品的 50%（向下取整，随机丢弃）
- 已获得的资源和经验保留（不扣）
- 角色立即返回星图

### 成功结算

- 所有事件完成后远征成功
- 全部战利品、经验、资源写入 GameState
- 弹出结算面板：列出获得的物品、资源、经验

## 代码架构

### 删除

| 文件 | 说明 |
|------|------|
| `src/roguelike/dungeonView.ts` | 手动地牢视图 |
| `src/roguelike/dungeonGen.ts` | 房间走廊生成器 |
| `src/roguelike/fogOfWar.ts` | 迷雾系统 |
| `src/render/canvasRenderer.ts` | Canvas 地图渲染 |
| `src/render/tileset.ts` | 瓦片定义 |
| `index.html` 中 `#dungeon-explore` + `#battle-screen` | 旧 DOM |

### 保留并改造

| 文件 | 改造内容 |
|------|----------|
| `src/roguelike/combat.ts` | 保留伤害公式和 buff，新增 AI 选技能，改为返回回合记录 |
| `src/roguelike/skills.ts` | 新增 `autoSelectSkill()` 优先级逻辑 |
| `src/roguelike/entities.ts` | 保留 |
| `src/roguelike/items.ts` | 保留，扩展事件掉落 |
| `src/data/enemies.json` | 保留，新增更多敌人 |
| `src/starmap/starMapView.ts` | 改造远征入口 |

### 新增

| 文件 | 说明 |
|------|------|
| `src/expedition/expeditionEvent.ts` | 事件类型 + 事件生成器 |
| `src/expedition/expeditionEngine.ts` | 远征引擎：状态管理、推进定时器、结算 |
| `src/expedition/expeditionView.ts` | 远征日志面板 UI |
| `src/expedition/expeditionBattle.ts` | 自动战斗可视化 |
| `src/expedition/autoCombat.ts` | 自动战斗 AI |
| `src/data/expeditionEvents.json` | 事件描述文本池 |

### 模块结构

```
src/expedition/          ← 新模块
  expeditionEvent.ts     — 事件数据 + 生成器
  expeditionEngine.ts    — 远征生命周期
  expeditionView.ts      — 日志面板 UI
  expeditionBattle.ts    — 战斗可视化
  autoCombat.ts          — 自动战斗 AI

src/roguelike/           ← 保留战斗核心
  combat.ts              — 改造（纯逻辑）
  skills.ts              — 改造（自动选择）
  entities.ts            — 保留
  items.ts               — 保留
```
