import type { GameState } from '../game/gameState.js';
import { getPlanets, isPlanetUnlocked } from './planets.js';
import { getShips, canBuildShip, buildShip } from './ships.js';
import { formatNumber } from '../ui/components.js';
import { getEnergyDiscount } from '../tech/techEffects.js';

const RESOURCE_NAMES: Record<string, string> = {
  minerals: '矿藏',
  energy: '能源',
  tech: '科技',
  alloys: '合金',
  relics: '圣物',
};

export function renderStarMapView(state: GameState, onPlanetSelect: (planetId: string) => void): void {
  renderShips(state, onPlanetSelect);
  renderPlanets(state, onPlanetSelect);
}

function renderShips(state: GameState, onPlanetSelect: (planetId: string) => void): void {
  const container = document.getElementById('ship-list');
  if (!container) return;
  const ships = getShips();
  container.innerHTML = '';

  for (const ship of ships) {
    const isBuilt = state.shipsBuilt.includes(ship.id);
    const canBuild = canBuildShip(state, ship.id);
    const card = document.createElement('div');
    card.className = `ship-card${isBuilt ? ' built' : ''}`;
    const costStr = Object.entries(ship.cost).map(([k, v]) => `${RESOURCE_NAMES[k] ?? k} ${formatNumber(v)}`).join(' · ');

    card.innerHTML = `
      <div class="ship-name">${ship.name}</div>
      <div class="ship-desc">${ship.description}</div>
      <div class="ship-meta">
        <span class="ship-cost">${isBuilt ? '航程: ' + ship.range + ' 星域' : '费用: ' + costStr}</span>
        <span class="ship-status ${isBuilt ? 'built' : 'locked'}">${isBuilt ? '已服役' : '未建造'}</span>
      </div>
    `;

    if (!isBuilt) {
      const btn = document.createElement('button');
      btn.className = 'upgrade-btn';
      btn.textContent = '建造';
      btn.disabled = !canBuild;
      btn.addEventListener('click', () => {
        buildShip(state, ship.id);
        renderStarMapView(state, onPlanetSelect);
      });
      card.appendChild(btn);
    }
    container.appendChild(card);
  }
}

function renderPlanets(state: GameState, onPlanetSelect: (planetId: string) => void): void {
  const container = document.getElementById('planet-list');
  if (!container) return;
  const planets = getPlanets();
  container.innerHTML = '';

  for (const planet of planets) {
    const unlocked = isPlanetUnlocked(state, planet.id);
    const discount = getEnergyDiscount(state.techUnlocked);
    const actualCost = Math.round(planet.energyCost * (1 - discount));
    const canAffordEnergy = state.resources.energy >= actualCost;
    const card = document.createElement('div');
    card.className = `planet-card${!unlocked ? ' locked' : ''}`;
    card.dataset.danger = String(planet.dangerLevel);

    const rewardStr = Object.entries(planet.rewards).map(([k, v]) => `${RESOURCE_NAMES[k] ?? k} +${v}`).join(' · ');
    card.innerHTML = `
      <div class="planet-header">
        <span class="planet-name">${planet.name}</span>
        <span class="planet-danger">危险 ${planet.dangerLevel}</span>
      </div>
      <div class="planet-desc">${planet.description}</div>
      <div class="planet-info">
        <span>能量: ${discount > 0 ? `<s style="color:var(--text-dim)">${formatNumber(planet.energyCost)}</s> ${formatNumber(actualCost)}` : formatNumber(planet.energyCost)}</span>
        <span>深度: ${planet.dungeonFloors}</span>
        <span>${rewardStr}</span>
      </div>
    `;

    if (unlocked) {
      card.addEventListener('click', () => {
        if (canAffordEnergy) onPlanetSelect(planet.id);
      });
      if (!canAffordEnergy) card.style.opacity = '0.6';
    }
    container.appendChild(card);
  }
}
