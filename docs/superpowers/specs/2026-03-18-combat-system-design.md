# 远征战斗系统重新设计

**日期**: 2026-03-18
**状态**: 已批准
**版本**: 1.0

---

## 1. 概述

将远征（Dungeon）视图的战斗系统从简单的"攻击/撤退"两个按钮，重新设计为完整的宝可梦风格回合制战斗系统，包含技能、MP、冷却等深度战斗机制。

### 1.1 目标

- 修复 Canvas 地牢地图不显示的问题
- 实现方案B：帝国军械库风格的完整回合制战斗界面
- 引入 MP 系统和职业专属技能
- 提升战斗沉浸感和策略深度

### 1.2 范围

- 修改 `main.ts` 中的 Canvas 初始化逻辑
- 重构 `dungeonView.ts` 中的战斗状态管理
- 扩展 `combat.ts` 支持技能、MP、冷却
- 新增 `src/roguelike/skills.ts` 技能定义和执行
- 更新 `index.html` 战斗界面布局
- 更新 `main.css` 战斗界面样式

---

## 2. Canvas 修复

### 2.1 问题

`#view-dungeon` 初始 `display:none`，导致 `container.clientWidth = 0`，Canvas 尺寸计算为 0×0，无法渲染。

### 2.2 解决方案

在 `main.ts` 中调整初始化顺序：先调用 `ui.showView('dungeon')` 使 DOM 可见，再计算 Canvas 尺寸。

```typescript
// 错误顺序（当前）
const w = container.clientWidth;  // = 0，因为 view 隐藏
canvas.width = w;
canvas.height = Math.floor(w * 0.75);
ui.showView('dungeon');

// 正确顺序
ui.showView('dungeon');  // 先显示
const w = container.clientWidth;  // 现在有值了
canvas.width = w;
canvas.height = Math.floor(w * 0.75);
```

---

## 3. 战斗界面布局

### 3.1 整体结构

```
┌─────────────────────────────────────────────────────┐
│ ⚔ 遭遇战斗                            第 III 层     │
├─────────────────────────────────────────────────────┤
│                                                     │
│     [敌方精灵]              [我方精灵]              │
│     恐虐神选                 星际战士              │
│     HP ████████░░ 170      HP ██████░░░  55      │
│                                                     │
├────────────────────────┬────────────────────────────┤
│ ▸ 战斗指令              │ ▸ 角色状态                │
│ [⚔攻击] [✨技能]        │ HP ██████░░░  55/100    │
│ [🎒道具] [🏃撤退]        │ MP ███░░░░░░  15/50     │
├────────────────────────┴────────────────────────────┤
│ ▸ 战斗记录                                          │
│ 你向恐虐神选发起攻击，造成 24 点伤害！               │
│ 恐虐神选反击！造成了 12 点伤害。                     │
└─────────────────────────────────────────────────────┘
```

### 3.2 组件说明

| 组件 | 描述 |
|------|------|
| 战斗头部 | 显示"遭遇战斗"标题 + 当前层数 |
| 战斗场景 | 左侧敌方精灵+状态，右侧我方精灵+状态 |
| 战斗指令面板 | 4个行动按钮：攻击、技能(×3) |
| 角色状态面板 | 我方 HP 条 + MP 条 |
| 战斗记录面板 | 滚动显示战斗日志 |

---

## 4. MP 系统

### 4.1 基础属性

| 属性 | 值 |
|------|-----|
| 最大 MP | 50（所有职业通用） |
| 每回合恢复 | 10 MP |
| MP 耗尽表现 | 技能按钮显示 disabled |

### 4.2 回合流程

```
玩家回合开始
    ↓
恢复 MP = min(maxMP, currentMP + 10)
减少所有技能冷却 -1（冷却 > 0 的技能）
    ↓
玩家选择行动
```

---

## 5. 技能系统

### 5.1 职业专属技能

#### 星际战士 (spaceMarine) — 平衡型
| 技能ID | 名称 | MP消耗 | 冷却 | 效果 |
|--------|------|--------|------|------|
| sm_charge | ⚔ 猛攻 | 15 | 0 | 造成 150% 攻击力伤害 |
| sm_shield_wall | 🛡 盾墙 | 10 | 2 | 本回合受到伤害减半 |
| sm_tactical | ✨ 战术指令 | 20 | 3 | 下次攻击伤害 +50% |

#### 审讯官 (inquisitor) — 高攻击型
| 技能ID | 名称 | MP消耗 | 冷却 | 效果 |
|--------|------|--------|------|------|
| inq_purge | 🔥 净化之火 | 25 | 2 | 造成 180% 攻击力伤害，对恶魔系敌人额外 +50% |
| inq_barrier | 🧠 精神壁垒 | 15 | 2 | 免疫下一次攻击 |
| inq_judgment | ⚖ 命运审判 | 35 | 4 | 必定命中，造成 200% 伤害 |

#### 机仆祭司 (techPriest) — 防御/辅助型
| 技能ID | 名称 | MP消耗 | 冷却 | 效果 |
|--------|------|--------|------|------|
| tp_overload | ⚡ 过载激光 | 20 | 2 | 造成 130% 伤害 + 10 固定伤害 |
| tp_repair | 🔧 修复立场 | 15 | 3 | 恢复 30% 最大生命值 |
| tp_rage | 🤖 机器狂怒 | 15 | 2 | 接下来2次攻击 +30% 伤害 |

#### 政委 (commissar) — 爆发型
| 技能ID | 名称 | MP消耗 | 冷却 | 效果 |
|--------|------|--------|------|------|
| com_execute | 🎯 处决射击 | 30 | 3 | 对生命值 <30% 的敌人造成 300% 伤害 |
| com_rally | 📢 振奋演说 | 10 | 2 | 恢复 20 MP |
| com_charge | 💀 死亡冲锋 | 25 | 3 | 造成 120% 伤害，吸取 50% 伤害转化为生命 |

### 5.2 技能数据结构

```typescript
interface SkillDef {
  id: string;
  name: string;
  icon: string;        // emoji 图标
  mpCost: number;
  cooldown: number;    // 初始冷却回合
  effect: SkillEffect;
}

type SkillEffect =
  | { type: 'damage'; multiplier: number; bonusDamage?: number }
  | { type: 'buff'; buffType: 'defense_half' | 'next_attack_boost'; value: number; duration: number }
  | { type: 'heal'; percent: number }
  | { type: 'mp_restore'; amount: number }
  | { type: 'lifesteal'; multiplier: number; lifestealPercent: number }
  | { type: 'immunity' }
  | { type: 'execute'; threshold: number; multiplier: number };
```

### 5.3 技能状态追踪

```typescript
interface CombatState {
  // ... 现有属性
  playerMp: number;
  playerMaxMp: number;
  skillCooldowns: Record<string, number>;  // skillId -> remaining cooldown
  skillBuffs: {
    nextAttackBoost?: number;     // 下次攻击加成 %
    defenseHalf?: boolean;       // 受伤减半
    immunity?: boolean;           // 免疫下一次
    lifestealHits?: number;      // 剩余吸血次数
  };
}
```

---

## 6. 战斗流程

### 6.1 完整回合循环

```
┌──────────────────────────────────────────────┐
│                  回合开始                     │
│  • MP 恢复 10 点                             │
│  • 所有技能冷却 -1                           │
│  • 清除已结束的 buff                         │
└────────────────────┬─────────────────────────┘
                     ↓
┌──────────────────────────────────────────────┐
│              玩家选择行动                      │
│  [攻击] [技能1] [技能2] [技能3] [道具] [撤退] │
└────────────────────┬─────────────────────────┘
                     ↓
         ┌───────────┴───────────┐
         ↓                       ↓
    普通攻击              技能使用
    • 伤害 = ATK×1.0      • 检查 MP 和冷却
    • 受防御减伤            • 扣除 MP
                          • 触发技能效果
                          • 记录冷却
         ↓                       ↓
    ┌────┴────────────────────────┐
    │        伤害结算               │
    │  • 计算防御减伤                │
    │  • 应用 buff（盾墙减半等）     │
    │  • 更新 HP                    │
    │  • 添加战斗日志               │
    └────────────┬─────────────────┘
                 ↓
┌──────────────────────────────────────────────┐
│         检查战斗是否结束                       │
│  • 敌人 HP ≤ 0 → 玩家胜利                    │
│  • 玩家 HP ≤ 0 → 玩家失败                    │
│  • 撤退成功 → 退出战斗                        │
└────────────────────┬─────────────────────────┘
                 战斗未结束
                     ↓
┌──────────────────────────────────────────────┐
│              敌人行动                          │
│  • AI 选择攻击/技能                           │
│  • 执行伤害结算                               │
│  • 更新 HP                                   │
└────────────────────┬─────────────────────────┘
                     ↓
              回合结束 → 返回"回合开始"
```

### 6.2 伤害计算公式

```typescript
function calcDamage(attack: number, defense: number, multiplier: number = 1): number {
  const base = Math.max(1, attack - defense);
  const randomized = base + Math.floor(Math.random() * 3) - 1;
  return Math.max(1, Math.floor(randomized * multiplier));
}
```

### 6.3 撤退机制

- 成功率：50%
- 成功：脱离战斗，返回星图
- 失败：敌人攻击一次（不减半），回合结束

---

## 7. 数据结构变更

### 7.1 DungeonRun 新增字段

```typescript
export interface DungeonRun {
  // ... 现有字段
  playerMp: number;
  playerMaxMp: number;
  skillCooldowns: Record<string, number>;
  skillBuffs: {
    nextAttackBoost?: number;
    defenseHalf?: boolean;
    immunity?: boolean;
    lifestealHits?: number;
  };
  energyCost?: number;  // 远征消耗的能量（用于结算）
}
```

### 7.2 SaveData 兼容性

新增字段需要在前端妥善处理（默认值的回退），确保旧存档兼容。

---

## 8. 文件变更清单

| 文件 | 变更类型 | 描述 |
|------|----------|------|
| `src/main.ts` | 修改 | 修复 Canvas 初始化顺序 |
| `src/roguelike/dungeonView.ts` | 修改 | 新增 MP、冷却、buff 状态管理 |
| `src/roguelike/combat.ts` | 修改 | 扩展支持技能效果、MP消耗、冷却 |
| `src/roguelike/skills.ts` | 新增 | 技能定义和执行逻辑 |
| `src/roguelike/entities.ts` | 修改 | EnemyDef 新增 type 字段（用于技能判定） |
| `src/data/enemies.json` | 修改 | 为敌人补充 type 字段 |
| `index.html` | 修改 | 新的战斗界面 DOM 结构 |
| `src/styles/main.css` | 修改 | 方案B战斗界面样式 |

---

## 9. 测试要点

- [ ] Canvas 地牢在进入远征时正确渲染
- [ ] 战斗界面正确显示敌我双方状态
- [ ] MP 消耗和恢复正确
- [ ] 冷却系统正确工作
- [ ] 各技能效果正确触发
- [ ] 战斗流程完整：玩家行动 → 敌人行动 → 回合结算
- [ ] 玩家死亡 / 敌人死亡 / 撤退 正确处理
- [ ] 旧存档兼容（新增字段有默认值）

---

## 10. 视觉效果

- 敌人精灵使用 emoji 渲染（👹 🦇 💀 等）
- 我方精灵根据职业显示（⚔ 🛡 🔧 📢）
- HP 条：绿色 > 50%，黄色 25-50%，红色 < 25%
- MP 条：蓝色渐变
- 技能按钮：根据 MP 和冷却状态 enabled/disabled
- 战斗日志：伤害红色，治疗绿色，系统消息金色
