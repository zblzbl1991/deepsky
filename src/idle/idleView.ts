import type { GameState, ResourceType } from '../game/gameState.js';
import { eventBus } from '../game/eventBus.js';
import { getBuildings, canUpgrade, upgradeBuilding, unlockBuilding, getUpgradeCost, getProductionRate } from './buildings.js';
import { formatNumber } from '../ui/components.js';

const RESOURCE_KEYS: ResourceType[] = ['minerals', 'energy', 'tech', 'alloys', 'relics'];

const RESOURCE_NAMES: Record<string, string> = {
  minerals: '矿藏',
  energy: '能源',
  tech: '科技',
  alloys: '合金',
  relics: '圣物',
};

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

export function renderIdleView(state: GameState): void {
  renderResources(state);
  renderBuildings(state);
}

/** Called every tick — only updates resource values, no DOM rebuild */
export function renderResources(state: GameState): void {
  for (const key of RESOURCE_KEYS) {
    const valueEl = document.getElementById(`res-${key}`);
    const rateEl = document.getElementById(`rate-${key}`);
    if (valueEl) {
      const newValue = formatNumber(state.resources[key]);
      if (valueEl.textContent !== newValue) {
        valueEl.textContent = newValue;
        valueEl.classList.remove('updated');
        // Trigger reflow then add animation class
        void valueEl.offsetWidth;
        valueEl.classList.add('updated');
      }
    }

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

/** Called on user action — rebuilds building cards */
export function renderBuildings(state: GameState): void {
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
      .map(([k, v]) => `${RESOURCE_NAMES[k] ?? k} ${formatNumber(v ?? 0)}`)
      .join(' · ');

    const prodStr = Object.entries(building.produces)
      .map(([k, v]) => `${RESOURCE_NAMES[k] ?? k} +${((v ?? 0) * (isUnlocked ? level : 1)).toFixed(1)}/s`)
      .join(' · ');

    card.innerHTML = `
      <div class="building-header">
        <span class="building-name">${building.name}</span>
        <span class="building-level">${isUnlocked ? toRoman(level) : '未解锁'}</span>
      </div>
      <div class="building-body">
        ${isUnlocked ? `
          <div class="building-stat-row building-output">
            <span class="stat-label">产出</span>
            <span class="stat-value building-production">${prodStr}</span>
          </div>
        ` : ''}
        <div class="building-stat-row building-cost-row">
          <span class="stat-label">${isUnlocked ? '升级' : '建造'}</span>
          <span class="stat-value building-cost">${costStr}</span>
        </div>
        <div class="building-desc">${building.description}</div>
      </div>
      <div class="building-actions"></div>
    `;

    const actionsDiv = card.querySelector('.building-actions')!;
    const btn = document.createElement('button');
    btn.className = 'upgrade-btn';
    btn.textContent = isUnlocked ? '升级' : '建造';
    btn.disabled = !canAfford;
    btn.addEventListener('click', () => {
      if (isUnlocked) {
        upgradeBuilding(state, building.id);
      } else {
        unlockBuilding(state, building.id);
      }
      renderIdleView(state);
    });
    actionsDiv.appendChild(btn);

    container.appendChild(card);
  }
}

export function initLevelUpListener(): void {
  eventBus.on('levelUp', (...args: unknown[]) => {
    const newLevel = args[0] as number;
    const milestone = args[1] as { productionMultiplier: number; expeditionHpBonus: number; extraBuildingSlots: number };
    const toast = document.createElement('div');
    toast.className = 'level-up-toast';
    let msg = `等级提升至 ${newLevel} 级！`;
    if (milestone.productionMultiplier > 1.0) msg += ' 产量提升！';
    if (milestone.expeditionHpBonus > 0) msg += ' 远征HP提升！';
    if (milestone.extraBuildingSlots > 0) msg += ' 解锁新建筑槽位！';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  });
}
