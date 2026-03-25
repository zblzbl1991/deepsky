import type { EnemyDef } from '../roguelike/entities.js';
import {
  createCombatState,
  executeCombatRound,
  isCombatOver,
  getCombatResult,
  useSkill,
  endTurn,
  executeEnemyTurn,
} from '../roguelike/combat.js';
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
      turnsUsed++;

      // Track damage dealt by skill
      totalDamageDealt += Math.max(0, prevEnemyHp - combat.enemyHp);

      // Track damage taken (skill use doesn't include enemy turn)
      // Enemy turn happens separately
      if (!isCombatOver(combat)) {
        const prevPlayerHp2 = combat.playerHp;
        executeEnemyTurn(combat);
        totalDamageReceived += Math.max(0, combat.playerHp - prevPlayerHp2);
        endTurn(combat);
      }
    } else {
      // Basic attack (includes enemy counterattack internally)
      executeCombatRound(combat, 'attack');
      turnsUsed++;

      const prevEnemyHp2 = combat.enemyHp;
      totalDamageDealt += Math.max(0, prevEnemyHp - combat.enemyHp);
      // Note: enemy counter damage is already included in playerHp diff from executeCombatRound
      // But we need to account for lifesteal healing
      const effectiveDamageTaken = Math.max(0, combat.playerHp - prevPlayerHp);
      // This can be negative due to lifesteal, so track actual damage events from log
      totalDamageReceived += Math.max(0, effectiveDamageTaken);

      if (!isCombatOver(combat)) {
        endTurn(combat);
      }
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
