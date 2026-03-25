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
  lifestealPercent?: number;
}

// ─── Skill Definitions by Class ─────────────────────────────────────────────

const CLASS_SKILLS: Record<string, SkillDef[]> = {
  spaceMarine: [
    {
      id: 'sm_charge',
      name: '猛攻',
      icon: '⚔',
      mpCost: 15,
      cooldown: 0,
      description: '星际战士发起猛烈冲锋，造成1.5倍攻击力伤害。',
      effect: { type: 'damage', multiplier: 1.5 },
    },
    {
      id: 'sm_shield_wall',
      name: '盾墙',
      icon: '🛡',
      mpCost: 10,
      cooldown: 2,
      description: '举起爆弹盾牌，下次受到的伤害减半。',
      effect: { type: 'buff', buffType: 'defense_half', duration: 1 },
    },
    {
      id: 'sm_tactical',
      name: '战术指令',
      icon: '📋',
      mpCost: 20,
      cooldown: 3,
      description: '发出战术指令，下一次攻击伤害提升50%。',
      effect: { type: 'buff', buffType: 'next_attack_boost', value: 50, duration: 1 },
    },
  ],

  inquisitor: [
    {
      id: 'inq_purge',
      name: '净化之火',
      icon: '🔥',
      mpCost: 25,
      cooldown: 2,
      description: '释放帝皇的净化之火，造成1.8倍伤害。对混沌类型敌人额外提升50%。',
      effect: { type: 'damage', multiplier: 1.8, bonusVsTypes: ['chaos'], bonusMultiplier: 0.5 },
    },
    {
      id: 'inq_barrier',
      name: '精神壁垒',
      icon: '🧠',
      mpCost: 15,
      cooldown: 2,
      description: '凝聚灵能屏障，免疫下一次负面效果。',
      effect: { type: 'immunity' },
    },
    {
      id: 'inq_judgment',
      name: '命运审判',
      icon: '⚡',
      mpCost: 35,
      cooldown: 4,
      description: '以审判庭之名降下毁灭性打击，造成2.0倍伤害。',
      effect: { type: 'damage', multiplier: 2.0 },
    },
  ],

  techPriest: [
    {
      id: 'tp_overload',
      name: '过载激光',
      icon: '🔫',
      mpCost: 20,
      cooldown: 2,
      description: '过载激光武器，造成1.3倍伤害并附加10点固定伤害。',
      effect: { type: 'damage', multiplier: 1.3, fixedBonusDamage: 10 },
    },
    {
      id: 'tp_repair',
      name: '修复立场',
      icon: '🔧',
      mpCost: 15,
      cooldown: 3,
      description: '激活伺服机械臂进行自我修复，恢复30%最大生命值。',
      effect: { type: 'heal', percent: 30 },
    },
    {
      id: 'tp_rage',
      name: '机器狂怒',
      icon: '⚙',
      mpCost: 15,
      cooldown: 2,
      description: '机械义体进入狂暴模式，接下来2次攻击伤害提升30%。',
      effect: { type: 'buff', buffType: 'next_attack_boost', value: 30, duration: 2 },
    },
  ],

  commissar: [
    {
      id: 'com_execute',
      name: '处决射击',
      icon: '💀',
      mpCost: 30,
      cooldown: 3,
      description: '瞄准敌人弱点。若目标生命值低于30%，造成300%伤害；否则造成100%伤害。',
      effect: { type: 'execute', threshold: 30, multiplier: 3 },
    },
    {
      id: 'com_rally',
      name: '振奋演说',
      icon: '📢',
      mpCost: 10,
      cooldown: 2,
      description: '发表激昂演说鼓舞士气，恢复20点行动点。',
      effect: { type: 'mp_restore', amount: 20 },
    },
    {
      id: 'com_charge',
      name: '死亡冲锋',
      icon: '🗡',
      mpCost: 25,
      cooldown: 3,
      description: '带头发起无畏冲锋，下一次攻击附带50%生命偷取效果。',
      effect: { type: 'buff', buffType: 'lifesteal', value: 50, duration: 1 },
    },
  ],
};

// ─── Public API ──────────────────────────────────────────────────────────────

export function getSkillsForClass(classId: string): SkillDef[] {
  return CLASS_SKILLS[classId] ?? [];
}

export function getSkillDef(classId: string, skillId: string): SkillDef | undefined {
  const skills = CLASS_SKILLS[classId];
  return skills?.find((s) => s.id === skillId);
}

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

  // Priority 1: Execute skill if enemy HP < threshold
  const executeSkill = available.find(s =>
    s.effect.type === 'execute' && (enemyHp / enemyMaxHp) < (s.effect.threshold / 100)
  );
  if (executeSkill) return executeSkill;

  // Priority 2: Heal/defense if player HP < 40%
  if (playerHp / playerMaxHp < 0.4) {
    const healSkill = available.find(s => s.effect.type === 'heal');
    if (healSkill) return healSkill;
    const defenseSkill = available.find(s =>
      s.effect.type === 'buff' && s.effect.buffType === 'defense_half'
    );
    if (defenseSkill) return defenseSkill;
  }

  // Priority 3: MP restore if MP is low
  if (playerMp < 20) {
    const mpSkill = available.find(s => s.effect.type === 'mp_restore');
    if (mpSkill) return mpSkill;
  }

  // Priority 4: Highest damage skill
  const getMultiplier = (s: SkillDef): number => {
    if (s.effect.type === 'damage') return s.effect.multiplier;
    if (s.effect.type === 'execute') return s.effect.multiplier;
    return 0;
  };
  const damageSkills = available.filter(s => getMultiplier(s) > 0);
  if (damageSkills.length > 0) {
    damageSkills.sort((a, b) => getMultiplier(b) - getMultiplier(a));
    return damageSkills[0];
  }

  // Priority 5: Buff skills
  const buffSkill = available.find(s => s.effect.type === 'buff');
  if (buffSkill) return buffSkill;

  // Fallback: immunity
  const immunitySkill = available.find(s => s.effect.type === 'immunity');
  if (immunitySkill) return immunitySkill;

  return null;
}
