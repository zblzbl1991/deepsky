import type { GameState } from '../game/gameState.js';
import { getPlanets, isPlanetUnlocked } from './planets.js';
import { getShips, canBuildShip, buildShip } from './ships.js';
import { formatNumber } from '../ui/components.js';

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
    const costStr = Object.entries(ship.cost).map(([k, v]) => `${k}: ${formatNumber(v)}`).join(', ');

    card.innerHTML = `
      <div class="ship-name">${ship.name}</div>
      <div class="ship-desc">${ship.description}</div>
      <div class="ship-cost">${isBuilt ? 'RANGE: ' + ship.range + ' sectors' : 'Cost: ' + costStr}</div>
      <div class="ship-status ${isBuilt ? 'built' : 'locked'}">${isBuilt ? 'COMMISSIONED' : 'NOT BUILT'}</div>
    `;

    if (!isBuilt) {
      const btn = document.createElement('button');
      btn.className = 'upgrade-btn';
      btn.textContent = 'CONSTRUCT';
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
    const canAffordEnergy = state.resources.energy >= planet.energyCost;
    const card = document.createElement('div');
    card.className = `planet-card${!unlocked ? ' locked' : ''}`;

    const rewardStr = Object.entries(planet.rewards).map(([k, v]) => `${k}: +${v}`).join(', ');
    card.innerHTML = `
      <div class="planet-header">
        <span class="planet-name">${planet.name}</span>
        <span class="planet-danger">DANGER ${'▓'.repeat(planet.dangerLevel)}${'░'.repeat(5 - planet.dangerLevel)}</span>
      </div>
      <div class="planet-desc">${planet.description}</div>
      <div class="planet-info">
        Energy: ${formatNumber(planet.energyCost)} | Floors: ${planet.dungeonFloors} | Rewards: ${rewardStr}
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
