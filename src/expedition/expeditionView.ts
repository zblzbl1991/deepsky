import type { Expedition } from './expeditionEngine.js';
import type { GameState } from '../game/gameState.js';
import { getPlanetDef } from '../starmap/planets.js';
import type { ResourceType } from '../game/gameState.js';

const RESOURCE_NAMES: Record<string, string> = {
  minerals: '矿藏', energy: '能源', tech: '科技', alloys: '合金', relics: '圣物',
};

export function renderExpeditionConfig(state: GameState): void {
  const configEl = document.getElementById('expedition-config')!;
  const panelEl = document.getElementById('expedition-panel')!;
  const battleEl = document.getElementById('expedition-battle')!;
  const resultEl = document.getElementById('expedition-result')!;

  configEl.style.display = 'block';
  panelEl.style.display = 'none';
  battleEl.style.display = 'none';
  resultEl.style.display = 'none';

  if (state.activeExpedition) {
    configEl.style.display = 'none';
    panelEl.style.display = 'block';
    renderExpeditionPanel(state.activeExpedition);
  }
}

export function renderExpeditionPanel(exp: Expedition): void {
  document.getElementById('expedition-config')!.style.display = 'none';
  document.getElementById('expedition-panel')!.style.display = 'block';
  document.getElementById('expedition-battle')!.style.display = 'none';
  document.getElementById('expedition-result')!.style.display = 'none';

  const planet = getPlanetDef(exp.planetId);
  const planetName = planet?.name ?? exp.planetId;
  const diffLabels: Record<number, string> = { 1: '低', 2: '中', 3: '高' };

  document.getElementById('expedition-planet-name')!.textContent = planetName;
  document.getElementById('expedition-difficulty')!.textContent = `难度：${diffLabels[exp.difficulty] ?? '—'}`;
  document.getElementById('expedition-progress')!.textContent = `进度：${exp.currentEventIndex}/${exp.events.length}`;

  // Status badge
  const statusEl = document.getElementById('expedition-status')!;
  if (exp.status === 'active') {
    statusEl.textContent = '进行中';
    statusEl.className = 'expedition-status-active';
  } else if (exp.status === 'success') {
    statusEl.textContent = '完成';
    statusEl.className = 'expedition-status-active expedition-status-success';
  } else {
    statusEl.textContent = '失败';
    statusEl.className = 'expedition-status-active expedition-status-failed';
  }

  // HP bar
  const hpPct = (exp.player.hp / exp.player.maxHp) * 100;
  document.getElementById('expedition-hp-text')!.textContent = `HP ${exp.player.hp}/${exp.player.maxHp}`;
  const hpBar = document.getElementById('expedition-hp-bar') as HTMLElement;
  hpBar.style.width = `${hpPct}%`;
  hpBar.className = 'expedition-hp-bar-fill' + (hpPct > 50 ? '' : hpPct > 25 ? ' medium' : ' low');

  // Event log
  const logEl = document.getElementById('expedition-log')!;
  logEl.innerHTML = '';

  exp.events.forEach((event, i) => {
    const div = document.createElement('div');
    div.className = 'expedition-log-entry ' + event.type;

    if (i < exp.currentEventIndex) {
      // Completed event — show summary
      const label = getEventTypeLabel(event.type);
      const summary = getEventSummary(event);
      div.innerHTML = `<div class="event-label">${label}</div><div>${summary}</div>`;
    } else if (i === exp.currentEventIndex && exp.status === 'active') {
      // Current event
      div.className += ' current';
      const label = getEventTypeLabel(event.type);
      const desc = event.type === 'combat' ? `遭遇 ${event.enemy.name}！` : event.description;
      div.innerHTML = `<div class="event-label">${label}</div><div>${desc}</div>`;
    } else {
      // Pending
      div.className += ' pending';
      div.innerHTML = '○ 未知事件';
    }

    logEl.appendChild(div);
  });

  // Loot
  const lootEl = document.getElementById('expedition-loot')!;
  lootEl.innerHTML = '';
  for (const item of exp.loot) {
    const span = document.createElement('span');
    span.className = 'expedition-loot-item';
    span.textContent = item.name;
    lootEl.appendChild(span);
  }
  for (const [type, amount] of Object.entries(exp.resourcesGained)) {
    if (amount > 0) {
      const span = document.createElement('span');
      span.className = 'expedition-loot-item';
      span.textContent = `${RESOURCE_NAMES[type] ?? type} +${amount}`;
      lootEl.appendChild(span);
    }
  }
}

export function showExpeditionResult(
  exp: Expedition,
  settlement: { expGained: number; loot: { itemId: string; name: string }[]; resourcesGained: Partial<Record<ResourceType, number>>; failedLoot: { itemId: string; name: string }[] },
  isFirstVisit = false,
): void {
  document.getElementById('expedition-panel')!.style.display = 'none';
  document.getElementById('expedition-battle')!.style.display = 'none';

  const resultEl = document.getElementById('expedition-result')!;
  resultEl.style.display = 'block';

  const isSuccess = exp.status === 'success';
  const title = isSuccess ? '远征完成' : '远征失败';
  const subtitle = isSuccess ? '帝皇庇佑！任务圆满完成。' : '帝皇庇佑……来世再战。';

  let lootHtml = '';
  if (settlement.loot.length > 0) {
    lootHtml = `<p>战利品：${settlement.loot.map(l => l.name).join('、')}</p>`;
  }
  let resHtml = '';
  for (const [type, amount] of Object.entries(settlement.resourcesGained)) {
    if (amount && amount > 0) {
      resHtml += `<p>${RESOURCE_NAMES[type] ?? type}：+${amount}</p>`;
    }
  }
  let failedHtml = '';
  if (settlement.failedLoot.length > 0) {
    failedHtml = `<p style="color:var(--red-40)">丢失战利品：${settlement.failedLoot.map(l => l.name).join('、')}</p>`;
  }

  const firstVisitHtml = isFirstVisit ? '<p style="color:var(--gold,#c8a832);font-weight:bold;font-size:14px">★ 首次探索奖励！</p>' : '';

  resultEl.innerHTML = `
    <h2>${title}</h2>
    <p>${subtitle}</p>
    ${firstVisitHtml}
    <p>获得经验：${settlement.expGained}</p>
    ${lootHtml}${resHtml}${failedHtml}
    <p style="font-size:var(--text-xs);color:var(--text-dim);margin-top:var(--space-4)">点击返回星图，或等待 3 秒自动返回。</p>
  `;
}

function getEventTypeLabel(type: string): string {
  switch (type) {
    case 'combat': return '战斗';
    case 'explore': return '探索';
    case 'encounter': return '遭遇';
    case 'loot': return '拾取';
    default: return '事件';
  }
}

function getEventSummary(event: Expedition['events'][0]): string {
  switch (event.type) {
    case 'combat': {
      if (!event.result) return '战斗中…';
      return event.result.victory
        ? `击败了 ${event.enemy.name}，损失 ${event.result.damageReceived} HP`
        : `被 ${event.enemy.name} 击败`;
    }
    case 'explore': {
      if (!event.outcome) return event.description;
      return event.outcome.success
        ? `探索成功（${event.outcome.reward ? `+${event.outcome.reward.value} EXP` : ''}）`
        : `探索失败（-${event.outcome.damage} HP）`;
    }
    case 'encounter':
      return event.description;
    case 'loot': {
      const lootName = event.itemDef?.name ?? event.resourceType ?? '物品';
      return `获得 ${lootName}${event.value ? ` x${event.value}` : ''}`;
    }
    default:
      return '—';
  }
}
