import { createGameState } from './game/gameState.js';
import { GameLoop } from './game/gameLoop.js';
import { SaveManager } from './game/saveManager.js';
import { createUIManager } from './ui/uiManager.js';
import { renderIdleView } from './idle/idleView.js';
import { renderStarMapView } from './starmap/starMapView.js';

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
      ui.showView(view);
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (view === 'idle') renderIdleView(state);
      if (view === 'starmap') {
        renderStarMapView(state, (planetId) => {
          console.log('Launching expedition to:', planetId);
        });
      }
    });
  });

  renderIdleView(state);
  gameLoop.start();

  setInterval(() => renderIdleView(state), 1000);
  setInterval(() => saveManager.save(state), 30000);
  window.addEventListener('beforeunload', () => saveManager.save(state));
}

init();
