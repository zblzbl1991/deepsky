import { createGameState, type GameState } from './game/gameState.js';
import { GameLoop } from './game/gameLoop.js';
import { SaveManager } from './game/saveManager.js';
import { createUIManager } from './ui/uiManager.js';
import { renderIdleView, renderResources, initLevelUpListener } from './idle/idleView.js';
import { renderStarMapView } from './starmap/starMapView.js';
import { getPlanetDef } from './starmap/planets.js';
import { createExpedition, advanceExpedition, settleExpedition, type Expedition } from './expedition/expeditionEngine.js';
import { renderExpeditionPanel, renderExpeditionConfig, showExpeditionResult } from './expedition/expeditionView.js';
import { showBattlePanel, hideBattlePanel, playAutoCombat } from './expedition/expeditionBattle.js';
import { getEnergyDiscount } from './tech/techEffects.js';

let gameState: GameState | null = null;
let expeditionTimer: ReturnType<typeof setInterval> | null = null;

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

function showExpeditionConfigModal(
  planetId: string,
  state: GameState,
  onConfirm: (planetId: string, difficulty: 1 | 2 | 3) => void,
): void {
  // Remove existing modal
  const existing = document.querySelector('.expedition-modal-overlay');
  if (existing) existing.remove();

  const planet = getPlanetDef(planetId);
  if (!planet) return;

  const overlay = document.createElement('div');
  overlay.className = 'expedition-modal-overlay';

  overlay.innerHTML = `
    <div class="expedition-modal">
      <h3>远征：${planet.name}</h3>
      <div class="planet-info">${planet.description}</div>
      <div class="difficulty-options">
        <button class="difficulty-btn difficulty-low" data-difficulty="1">
          <span class="diff-label">低难度</span>
          <span class="diff-info">8个事件 · 敌人较弱</span>
        </button>
        <button class="difficulty-btn difficulty-mid" data-difficulty="2">
          <span class="diff-label">中难度</span>
          <span class="diff-info">11个事件 · 含精英敌人</span>
        </button>
        <button class="difficulty-btn difficulty-high" data-difficulty="3">
          <span class="diff-label">高难度</span>
          <span class="diff-info">14个事件 · 含Boss战</span>
        </button>
      </div>
      <button class="upgrade-btn" id="modal-cancel" style="border-color:var(--text-dim);color:var(--text-dim)">取消</button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const diff = parseInt((btn as HTMLElement).dataset.difficulty!) as 1 | 2 | 3;
      overlay.remove();
      onConfirm(planetId, diff);
    });
  });

  document.getElementById('modal-cancel')!.addEventListener('click', () => {
    overlay.remove();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

function startExpedition(planetId: string, difficulty: 1 | 2 | 3): void {
  const state = gameState!;
  const planet = getPlanetDef(planetId);
  if (!planet) return;
  const discount = getEnergyDiscount(state.techUnlocked);
  const actualCost = Math.round(planet.energyCost * (1 - discount));
  if (state.resources.energy < actualCost) return;

  state.spendResource('energy', actualCost);

  const exp = createExpedition(planetId, difficulty, state.player.class, state.player.level, state.techUnlocked);
  state.activeExpedition = exp;

  // Show expedition panel
  const ui = createUIManager();
  ui.showView('dungeon');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-view="dungeon"]')!.classList.add('active');
  document.getElementById('view-title')!.textContent = '远征';

  renderExpeditionPanel(exp);

  // Start auto-advance timer (4 seconds per event)
  if (expeditionTimer) clearInterval(expeditionTimer);
  expeditionTimer = setInterval(() => {
    advanceOneEvent(state);
  }, 4000);
}

function advanceOneEvent(state: GameState): void {
  const exp = state.activeExpedition;
  if (!exp || exp.status !== 'active') {
    if (expeditionTimer) {
      clearInterval(expeditionTimer);
      expeditionTimer = null;
    }
    return;
  }

  const event = exp.events[exp.currentEventIndex];
  if (!event) return;

  if (event.type === 'combat') {
    // Pause timer during battle animation
    if (expeditionTimer) {
      clearInterval(expeditionTimer);
      expeditionTimer = null;
    }

    showBattlePanel(event.enemy, exp.currentEventIndex, exp.events.length);

    playAutoCombat(exp.player, event.enemy, (result) => {
      event.result = result;

      if (result.victory) {
        exp.player.hp = result.hpRemaining;
        exp.expGained += event.enemy.exp;
      } else {
        exp.player.hp = 0;
      }

      if (exp.player.hp <= 0) {
        exp.status = 'failed';
      }

      exp.currentEventIndex++;
      if (exp.currentEventIndex >= exp.events.length && exp.status === 'active') {
        exp.status = 'success';
      }

      hideBattlePanel();

      if (exp.status !== 'active') {
        finishExpedition(state);
      } else {
        renderExpeditionPanel(exp);
        expeditionTimer = setInterval(() => {
          advanceOneEvent(state);
        }, 4000);
      }
    });
  } else {
    advanceExpedition(exp);
    renderExpeditionPanel(exp);

    if (exp.status !== 'active') {
      if (expeditionTimer) {
        clearInterval(expeditionTimer);
        expeditionTimer = null;
      }
      finishExpedition(state);
    }
  }
}

function finishExpedition(state: GameState): void {
  const exp = state.activeExpedition;
  if (!exp) return;

  const settlement = settleExpedition(exp);

  // Apply rewards to game state
  state.player.exp += settlement.expGained;
  for (const [type, amount] of Object.entries(settlement.resourcesGained)) {
    if (amount && amount > 0) {
      state.addResource(type as 'minerals' | 'energy' | 'tech' | 'alloys' | 'relics', amount);
    }
  }

  showExpeditionResult(exp, settlement);
  state.activeExpedition = undefined;
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
          // Show expedition config modal instead of starting directly
          showExpeditionConfigModal(planetId, state, (pid, difficulty) => {
            startExpedition(pid, difficulty);
          });
        });
      }
      if (view === 'dungeon') {
        if (state.activeExpedition) {
          renderExpeditionPanel(state.activeExpedition);
        } else {
          renderExpeditionConfig(state);
        }
      }
    });
  });

  // Resume active expedition from save
  if (state.activeExpedition && state.activeExpedition.status === 'active') {
    expeditionTimer = setInterval(() => {
      advanceOneEvent(state);
    }, 4000);
  } else if (state.activeExpedition) {
    // Show result for completed/failed expedition
    const settlement = settleExpedition(state.activeExpedition);
    showExpeditionResult(state.activeExpedition, settlement);
    state.player.exp += settlement.expGained;
    for (const [type, amount] of Object.entries(settlement.resourcesGained)) {
      if (amount && amount > 0) {
        state.addResource(type as 'minerals' | 'energy' | 'tech' | 'alloys' | 'relics', amount);
      }
    }
    state.activeExpedition = undefined;
  }

  renderIdleView(state);
  initLevelUpListener();
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
