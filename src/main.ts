import { createGameState } from './game/gameState.js';
import { GameLoop } from './game/gameLoop.js';
import { SaveManager } from './game/saveManager.js';
import { createUIManager } from './ui/uiManager.js';
import { renderIdleView, renderResources } from './idle/idleView.js';
import { renderStarMapView } from './starmap/starMapView.js';
import { getPlanetDef } from './starmap/planets.js';
import { startDungeonRun, enterFloor, movePlayer, playerAttack, playerFlee, useSkillById, type DungeonRun } from './roguelike/dungeonView.js';
import { CanvasRenderer } from './render/canvasRenderer.js';
import { getSkillsForClass } from './roguelike/skills.js';
import { endTurn, executeEnemyTurn } from './roguelike/combat.js';
import type { GameState } from './game/gameState.js';

let dungeonRun: DungeonRun | null = null;
let dungeonRenderer: CanvasRenderer | null = null;
let dungeonAnimFrame: number | null = null;
let gameState: GameState | null = null;

function toRoman(n: number): string {
  const romanMap: [number, string][] = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let result = '';
  for (const [value, numeral] of romanMap) {
    while (n >= value) {
      result += numeral;
      n -= value;
    }
  }
  return result || 'I';
}

function renderBattleUI(run: DungeonRun): void {
  const cs = run.combatState!;
  const playerClass = gameState!.player.class;
  const skills = getSkillsForClass(playerClass);

  // Enemy info
  document.getElementById('battle-floor')!.textContent = `第 ${toRoman(run.currentFloor)} 层`;
  document.getElementById('enemy-name')!.textContent = cs.enemy.name;
  const enemyHpPct = (cs.enemyHp / cs.enemyMaxHp) * 100;
  document.getElementById('enemy-hp-bar')!.style.width = `${enemyHpPct}%`;
  document.getElementById('enemy-hp-text')!.textContent = `${cs.enemyHp}/${cs.enemyMaxHp}`;

  // Player info
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

  // Status panel
  document.getElementById('status-hp-bar')!.style.width = `${playerHpPct}%`;
  document.getElementById('status-hp-text')!.textContent = `${cs.playerHp}/${cs.playerMaxHp}`;
  document.getElementById('status-mp-bar')!.style.width = `${mpPct}%`;
  document.getElementById('status-mp-text')!.textContent = `${cs.playerMp}/${cs.playerMaxMp}`;

  // HP bar color
  const hpBarClass = playerHpPct > 50 ? '' : playerHpPct > 25 ? 'medium' : 'low';
  ['player-hp-bar', 'status-hp-bar'].forEach(id => {
    const el = document.getElementById(id)!;
    el.className = `stat-bar-fill hp ${hpBarClass}`;
  });
  const enemyHpBarClass = enemyHpPct > 50 ? '' : enemyHpPct > 25 ? 'medium' : 'low';
  document.getElementById('enemy-hp-bar')!.className = `stat-bar-fill hp ${enemyHpBarClass}`;

  // Skill buttons
  const skillBtnIds = ['btn-skill1', 'btn-skill2', 'btn-skill3'];
  const cdIds = ['cd-skill1', 'cd-skill2', 'cd-skill3'];
  skills.forEach((skill, i) => {
    const btn = document.getElementById(skillBtnIds[i]);
    const cdEl = document.getElementById(cdIds[i]);
    if (!btn) return;

    (btn as HTMLButtonElement).textContent = `${skill.icon} ${skill.name}`;
    const mpOk = run.playerMp >= skill.mpCost;
    const onCd = (run.skillCooldowns[skill.id] || 0) > 0;
    (btn as HTMLButtonElement).disabled = !mpOk || onCd;

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

  // Combat log
  document.getElementById('battle-log')!.innerHTML = cs.log.map(l => {
    let cls = 'log-entry';
    if (l.includes('伤害')) cls += ' damage';
    else if (l.includes('恢复') || l.includes('吸取')) cls += ' heal';
    else if (l.includes('选择') || l.includes('免疫') || l.includes('抵挡')) cls += ' system';
    else cls += ' player-action';
    return `<div class="${cls}">${l}</div>`;
  }).join('');

  const logEl = document.getElementById('battle-log')!;
  logEl.scrollTop = logEl.scrollHeight;
}

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

async function init() {
  const state = createGameState();
  gameState = state;
  const ui = createUIManager();
  const saveManager = new SaveManager();
  const gameLoop = new GameLoop(state);

  // Try to load save
  const loaded = await saveManager.load(state);
  if (!loaded) {
    state.addResource('minerals', 100);
    state.addResource('energy', 50);
  } else {
    const now = Date.now();
    const elapsed = Math.floor((now - state.lastTickTime) / 1000);
    if (elapsed > 5) {
      const { calculateOfflineProgress } = await import('./game/gameLoop.js');
      const capped = calculateOfflineProgress(state, elapsed);
      if (capped > 0) {
        const minutes = Math.floor(capped / 60);
        const msg = `Welcome back, Commander. ${minutes} minute${minutes !== 1 ? 's' : ''} of production recovered.`;
        console.log(msg);
        alert(msg);
      }
      renderIdleView(state);
    }
  }

  // Nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = (btn as HTMLElement).dataset.view as 'idle' | 'starmap' | 'dungeon';

      // Clean up dungeon when leaving
      if (view !== 'dungeon' && dungeonRun) {
        if (dungeonRun.gameOver) {
          state.player.exp += dungeonRun.exp;
          if (dungeonRun.victory) {
            for (const itemId of dungeonRun.loot) {
              if (itemId === 'stcFragment') state.addResource('tech', 50);
            }
          }
          dungeonRun = null;
          dungeonRenderer = null;
          if (dungeonAnimFrame) {
            cancelAnimationFrame(dungeonAnimFrame);
            dungeonAnimFrame = null;
          }
        }
      }

      ui.showView(view);
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update header title
      const titles: Record<string, string> = {
        idle: '帝国哨站',
        starmap: '星图',
        dungeon: '远征',
      };
      const titleEl = document.getElementById('view-title');
      if (titleEl && titles[view]) titleEl.textContent = titles[view];

      if (view === 'idle') renderIdleView(state);
      if (view === 'starmap') {
        renderStarMapView(state, (planetId) => {
          const planet = getPlanetDef(planetId);
          if (!planet || state.resources.energy < planet.energyCost) return;
          state.spendResource('energy', planet.energyCost);

          dungeonRun = startDungeonRun(state, planetId, planet.dungeonFloors);
          enterFloor(dungeonRun, 1);

          document.getElementById('dungeon-result')!.style.display = 'none';
          document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
          document.querySelector('[data-view="dungeon"]')!.classList.add('active');
          ui.showView('dungeon');

          const canvas = document.getElementById('dungeon-canvas') as HTMLCanvasElement;
          const container = document.getElementById('dungeon-container')!;
          const w = Math.min(container.clientWidth, 640);
          canvas.width = w;
          canvas.height = Math.floor(w * 0.75);
          dungeonRenderer = new CanvasRenderer('dungeon-canvas');

          if (dungeonAnimFrame) cancelAnimationFrame(dungeonAnimFrame);
          const animate = () => {
            renderDungeonView();
            if (dungeonRun && !dungeonRun.gameOver) {
              dungeonAnimFrame = requestAnimationFrame(animate);
            }
          };
          animate();
        });
      }
    });
  });

  // Keyboard controls for dungeon
  document.addEventListener('keydown', (e) => {
    if (!dungeonRun || dungeonRun.gameOver) return;
    const keyMap: Record<string, [number, number]> = {
      'ArrowUp': [0, -1], 'ArrowDown': [0, 1], 'ArrowLeft': [-1, 0], 'ArrowRight': [1, 0],
      'w': [0, -1], 's': [0, 1], 'a': [-1, 0], 'd': [1, 0],
      'W': [0, -1], 'S': [0, 1], 'A': [-1, 0], 'D': [1, 0],
    };
    const dir = keyMap[e.key];
    if (dir) { e.preventDefault(); movePlayer(dungeonRun, dir[0], dir[1]); }
    if (e.key === ' ') { e.preventDefault(); movePlayer(dungeonRun, 0, 0); }
  });

  // Move button controls
  document.querySelectorAll('.move-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!dungeonRun || dungeonRun.gameOver) return;
      const dir = (btn as HTMLElement).dataset.dir;
      const dirMap: Record<string, [number, number]> = {
        up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0], wait: [0, 0],
      };
      if (dirMap[dir!]) movePlayer(dungeonRun, dirMap[dir!][0], dirMap[dir!][1]);
    });
  });

  // Combat button controls
  document.getElementById('btn-attack')!.addEventListener('click', () => {
    if (!dungeonRun || !dungeonRun.inCombat || !dungeonRun.combatState) return;
    playerAttack(dungeonRun);
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

  renderIdleView(state);
  gameLoop.start();

  setInterval(() => renderResources(state), 1000);
  setInterval(() => {
    saveManager.save(state);
    const indicator = document.getElementById('save-indicator');
    if (indicator) {
      indicator.classList.add('flash');
      setTimeout(() => indicator.classList.remove('flash'), 1000);
    }
  }, 30000);
  window.addEventListener('beforeunload', () => saveManager.save(state));
}

init();
