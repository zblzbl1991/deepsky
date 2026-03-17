import { createGameState } from './game/gameState.js';
import { GameLoop } from './game/gameLoop.js';
import { SaveManager } from './game/saveManager.js';
import { createUIManager } from './ui/uiManager.js';
import { renderIdleView } from './idle/idleView.js';
import { renderStarMapView } from './starmap/starMapView.js';
import { getPlanetDef } from './starmap/planets.js';
import { startDungeonRun, enterFloor, movePlayer, playerAttack, playerFlee, type DungeonRun } from './roguelike/dungeonView.js';
import { CanvasRenderer } from './render/canvasRenderer.js';

let dungeonRun: DungeonRun | null = null;
let dungeonRenderer: CanvasRenderer | null = null;
let dungeonAnimFrame: number | null = null;

function renderDungeonView(): void {
  if (!dungeonRun) return;

  document.getElementById('dungeon-floor')!.textContent = `Floor ${dungeonRun.currentFloor}/${dungeonRun.maxFloors}`;
  document.getElementById('dungeon-hp')!.textContent = `HP: ${dungeonRun.playerHp}/${dungeonRun.playerMaxHp}`;
  document.getElementById('dungeon-atk')!.textContent = `ATK: ${dungeonRun.playerAttack}`;
  document.getElementById('dungeon-def')!.textContent = `DEF: ${dungeonRun.playerDefense}`;
  document.getElementById('dungeon-exp')!.textContent = `EXP: ${dungeonRun.exp}`;

  const combatPanel = document.getElementById('combat-panel')!;
  if (dungeonRun.inCombat && dungeonRun.combatState) {
    combatPanel.style.display = 'block';
    document.getElementById('combat-info')!.textContent =
      `${dungeonRun.combatState.enemy.name} — HP: ${dungeonRun.combatState.enemyHp}/${dungeonRun.combatState.enemyMaxHp}`;
    document.getElementById('combat-log')!.innerHTML =
      dungeonRun.combatLog.map(l => `<p>${l}</p>`).join('');
  } else {
    combatPanel.style.display = 'none';
  }

  document.getElementById('dungeon-log')!.innerHTML =
    dungeonRun.combatLog.slice(-5).map(l => `<p>${l}</p>`).join('');

  if (dungeonRenderer) {
    dungeonRenderer.renderDungeon(
      dungeonRun.dungeon,
      dungeonRun.fog,
      dungeonRun.playerPos,
      dungeonRun.activeEnemies,
      dungeonRun.activeItems,
    );
  }

  if (dungeonRun.gameOver) {
    const resultEl = document.getElementById('dungeon-result')!;
    resultEl.style.display = 'block';
    if (dungeonRun.victory) {
      resultEl.innerHTML = `<h2>EXPEDITION COMPLETE</h2><p>All floors cleared! For the Emperor!</p><p>EXP gained: ${dungeonRun.exp} | Loot: ${dungeonRun.loot.join(', ') || 'none'}</p>`;
    } else {
      resultEl.innerHTML = `<h2>FALLEN IN BATTLE</h2><p>The Emperor protects... in the next life.</p><p>EXP gained: ${dungeonRun.exp}</p>`;
    }
  }
}

async function init() {
  const state = createGameState();
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
        console.log(`Welcome back, Commander. ${Math.floor(capped / 60)} minutes of production recovered.`);
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
      if (view === 'idle') renderIdleView(state);
      if (view === 'starmap') {
        renderStarMapView(state, (planetId) => {
          const planet = getPlanetDef(planetId);
          if (!planet || state.resources.energy < planet.energyCost) return;
          state.spendResource('energy', planet.energyCost);

          dungeonRun = startDungeonRun(state, planetId, planet.dungeonFloors);
          enterFloor(dungeonRun, 1);

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
    if (dungeonRun) playerAttack(dungeonRun);
  });
  document.getElementById('btn-flee')!.addEventListener('click', () => {
    if (dungeonRun) playerFlee(dungeonRun);
  });

  renderIdleView(state);
  gameLoop.start();

  setInterval(() => renderIdleView(state), 1000);
  setInterval(() => saveManager.save(state), 30000);
  window.addEventListener('beforeunload', () => saveManager.save(state));
}

init();
