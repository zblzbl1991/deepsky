import type { EnemyDef } from '../roguelike/entities.js';
import type { CombatResult } from './expeditionEvent.js';
import { createCombatState, useSkill, executeCombatRound, isCombatOver, getCombatResult, endTurn, executeEnemyTurn } from '../roguelike/combat.js';
import { autoSelectSkill } from '../roguelike/skills.js';

type BattleDoneCallback = (result: CombatResult) => void;

export function showBattlePanel(enemy: EnemyDef, eventIndex: number, totalEvents: number): void {
  const panelEl = document.getElementById('expedition-panel')!;
  const battleEl = document.getElementById('expedition-battle')!;
  const resultEl = document.getElementById('expedition-result')!;

  panelEl.style.display = 'none';
  resultEl.style.display = 'none';
  battleEl.style.display = 'block';

  document.getElementById('exp-battle-event')!.textContent = `第 ${eventIndex + 1}/${totalEvents} 个事件`;
  document.getElementById('exp-enemy-name')!.textContent = enemy.name;

  // Reset bars
  document.getElementById('exp-enemy-hp-bar')!.setAttribute('style', 'width:100%');
  document.getElementById('exp-enemy-hp-text')!.textContent = `${enemy.hp}/${enemy.hp}`;
  document.getElementById('exp-battle-log')!.innerHTML = '<div class="log-entry system">战斗开始…</div>';
}

export function hideBattlePanel(): void {
  document.getElementById('expedition-battle')!.style.display = 'none';
}

export function playAutoCombat(
  player: { hp: number; mp: number; maxHp: number; maxMp: number; attack: number; defense: number; classId: string },
  enemy: EnemyDef,
  onDone: BattleDoneCallback,
): void {
  const combat = createCombatState(
    player.hp, player.mp,
    player.attack, player.defense,
    enemy,
  );

  const logEl = document.getElementById('exp-battle-log')!;
  const turns: Array<{ playerHp: number; enemyHp: number; playerMp: number; log: string[] }> = [];

  // Simulate all turns upfront to get the result
  const allTurnData: Array<{ playerHp: number; playerMp: number; enemyHp: number; playerMaxHp: number; playerMaxMp: number; enemyMaxHp: number; log: string[] }> = [];

  while (!isCombatOver(combat)) {
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
      if (!isCombatOver(combat)) {
        executeEnemyTurn(combat);
        endTurn(combat);
      }
    } else {
      executeCombatRound(combat, 'attack');
      if (!isCombatOver(combat)) {
        endTurn(combat);
      }
    }

    allTurnData.push({
      playerHp: combat.playerHp,
      playerMp: combat.playerMp,
      enemyHp: combat.enemyHp,
      playerMaxHp: combat.playerMaxHp,
      playerMaxMp: combat.playerMaxMp,
      enemyMaxHp: combat.enemyMaxHp,
      log: [...combat.log],
    });
  }

  const finalResult = getCombatResult(combat);
  const combatResult: CombatResult = {
    victory: finalResult.winner === 'player',
    turnsUsed: allTurnData.length,
    hpRemaining: Math.max(0, combat.playerHp),
    damageDealt: 0,
    damageReceived: 0,
    log: combat.log,
  };

  // Animate turn by turn
  let turnIdx = 0;
  const animateTurn = () => {
    if (turnIdx >= allTurnData.length) {
      // Battle complete
      const resultText = combatResult.victory
        ? '帝皇庇佑！敌人被击杀！'
        : '战败……撤退至远征队。';
      logEl.innerHTML += `<div class="log-entry system">${resultText}</div>`;
      logEl.scrollTop = logEl.scrollHeight;

      setTimeout(() => {
        onDone(combatResult);
      }, 800);
      return;
    }

    const data = allTurnData[turnIdx];

    // Determine which log entries are new
    const prevLogLen = turnIdx > 0 ? allTurnData[turnIdx - 1].log.length : 1;
    const newEntries = data.log.slice(prevLogLen);

    for (const entry of newEntries) {
      let cls = 'log-entry';
      if (entry.includes('伤害')) cls += ' damage';
      else if (entry.includes('恢复') || entry.includes('吸取')) cls += ' heal';
      else if (entry.includes('免疫') || entry.includes('抵挡') || entry.includes('冷却')) cls += ' system';
      else cls += ' player-action';
      logEl.innerHTML += `<div class="${cls}">${entry}</div>`;
    }

    // Update HP bars
    const enemyPct = Math.max(0, (data.enemyHp / data.enemyMaxHp) * 100);
    document.getElementById('exp-enemy-hp-bar')!.setAttribute('style', `width:${enemyPct}%`);
    document.getElementById('exp-enemy-hp-text')!.textContent = `${Math.max(0, data.enemyHp)}/${data.enemyMaxHp}`;

    const playerPct = Math.max(0, (data.playerHp / data.playerMaxHp) * 100);
    document.getElementById('exp-player-hp-bar')!.setAttribute('style', `width:${playerPct}%`);
    document.getElementById('exp-player-hp-text')!.textContent = `${Math.max(0, data.playerHp)}/${data.playerMaxHp}`;

    document.getElementById('exp-player-mp-bar')!.setAttribute('style', `width:${(data.playerMp / data.playerMaxMp) * 100}%`);
    document.getElementById('exp-player-mp-text')!.textContent = `${data.playerMp}/${data.playerMaxMp}`;

    logEl.scrollTop = logEl.scrollHeight;

    turnIdx++;
    setTimeout(animateTurn, 1200);
  };

  setTimeout(animateTurn, 500);
}
