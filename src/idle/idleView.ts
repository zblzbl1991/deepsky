import type { GameState, ResourceType } from '../game/gameState.js';
import { getBuildings, canUpgrade, upgradeBuilding, unlockBuilding, getUpgradeCost, getProductionRate } from './buildings.js';
import { formatNumber } from '../ui/components.js';

const RESOURCE_KEYS: ResourceType[] = ['minerals', 'energy', 'tech', 'alloys', 'relics'];

export function renderIdleView(state: GameState): void {
  renderResources(state);
  renderBuildings(state);
}

function renderResources(state: GameState): void {
  for (const key of RESOURCE_KEYS) {
    const valueEl = document.getElementById(`res-${key}`);
    const rateEl = document.getElementById(`rate-${key}`);
    if (valueEl) valueEl.textContent = formatNumber(state.resources[key]);

    let rate = 0;
    const buildings = getBuildings();
    for (const b of buildings) {
      const bs = state.buildings[b.id];
      if (!bs?.unlocked) continue;
      if (b.produces[key]) {
        rate += (b.produces[key] ?? 0) * bs.level;
      }
    }
    if (rateEl) {
      rateEl.textContent = rate > 0 ? `+${rate.toFixed(1)}/s` : '';
    }
  }
}

function renderBuildings(state: GameState): void {
  const container = document.getElementById('building-list');
  if (!container) return;

  const buildings = getBuildings();
  container.innerHTML = '';

  for (const building of buildings) {
    const bs = state.buildings[building.id];
    const isUnlocked = bs?.unlocked ?? false;
    const level = isUnlocked ? bs!.level : 0;
    const cost = getUpgradeCost(building.id, level);
    const canAfford = state.canAfford(cost);
    const rate = isUnlocked ? getProductionRate(building.id, level) : 0;

    const card = document.createElement('div');
    card.className = `building-card${!isUnlocked ? ' locked' : ''}`;

    const costStr = Object.entries(cost)
      .map(([k, v]) => `${k}: ${formatNumber(v ?? 0)}`)
      .join(', ');

    const prodStr = Object.entries(building.produces)
      .map(([k, v]) => `${k}: +${((v ?? 0) * (isUnlocked ? level : 1)).toFixed(1)}/s`)
      .join(', ');

    card.innerHTML = `
      <div class="building-header">
        <span class="building-name">${building.name}</span>
        <span class="building-level">${isUnlocked ? `Lv.${level}` : 'LOCKED'}</span>
      </div>
      <div class="building-desc">${building.description}</div>
      ${isUnlocked ? `<div class="building-production">Produces: ${prodStr}</div>` : ''}
      <div class="building-cost">${isUnlocked ? 'Upgrade' : 'Build'}: ${costStr}</div>
    `;

    const btn = document.createElement('button');
    btn.className = 'upgrade-btn';
    btn.textContent = isUnlocked ? 'UPGRADE' : 'CONSTRUCT';
    btn.disabled = !canAfford;
    btn.addEventListener('click', () => {
      if (isUnlocked) {
        upgradeBuilding(state, building.id);
      } else {
        unlockBuilding(state, building.id);
      }
      renderIdleView(state);
    });
    card.appendChild(btn);

    container.appendChild(card);
  }
}
