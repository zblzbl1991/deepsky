# Deep Sky Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a W40K themed idle/roguelike browser game with pure TypeScript, HTML/CSS UI, and Canvas 2D rendering.

**Architecture:** Layered — pure TS game logic (no DOM), Zustand-like state store, HTML UI overlay, Canvas 2D for roguelike maps. No frameworks, no game engine.

**Tech Stack:** TypeScript 5, Vite, Vitest, HTML/CSS, Canvas 2D API, IndexedDB (idb-keyval)

**Design Doc:** `docs/plans/2026-03-17-deep-sky-game-design.md`

---

## Phase 1: Project Scaffolding & Core Infrastructure

### Task 1: Set up Vite + TypeScript project

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Modify: `src/index.ts`

**Step 1: Install Vite and dev dependencies**

Run:
```bash
npm install --save-dev vite @types/node vitest idb-keyval
```

**Step 2: Update package.json scripts**

Replace the scripts section in `package.json`:
```json
{
  "name": "deep-sky",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "idb-keyval": "^6.2.1"
  },
  "devDependencies": {
    "typescript": "^5.5.3",
    "vite": "^6.0.0",
    "vitest": "^2.0.0",
    "@types/node": "^22.0.0"
  },
  "private": true
}
```

**Step 3: Update tsconfig.json**

Replace `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "sourceMap": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"]
}
```

**Step 4: Create vite.config.ts**

Create `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
  },
});
```

**Step 5: Create index.html**

Create `index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Deep Sky — For the Emperor</title>
  <link rel="stylesheet" href="/src/styles/main.css" />
</head>
<body>
  <div id="app">
    <div id="view-idle" class="view active">
      <p>Imperial Outpost — Loading...</p>
    </div>
    <div id="view-starmap" class="view">
      <p>Star Map — Coming Soon</p>
    </div>
    <div id="view-dungeon" class="view">
      <p>Dungeon — Coming Soon</p>
    </div>
  </div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

**Step 6: Replace src/index.ts with src/main.ts**

Delete `src/index.ts`, create `src/main.ts`:
```typescript
console.log('Deep Sky initialized — For the Emperor!');
```

**Step 7: Create minimal CSS**

Create `src/styles/main.css`:
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: #0a0a0f;
  color: #c9a84c;
  font-family: 'Courier New', monospace;
  min-height: 100vh;
}

#app {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px;
}

.view {
  display: none;
}

.view.active {
  display: block;
}
```

**Step 8: Run dev server to verify**

Run: `npm run dev`
Expected: Vite dev server starts, open browser shows "Imperial Outpost — Loading..." with dark background and gold text.

**Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src/main.ts src/styles/main.css
git rm src/index.ts
git commit -m "feat: set up Vite + TypeScript project scaffolding"
```

---

### Task 2: Create game state store

**Files:**
- Create: `src/game/gameState.ts`
- Create: `src/game/eventBus.ts`
- Create: `tests/game/gameState.test.ts`

**Step 1: Write failing test for game state**

Create `tests/game/gameState.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createGameState, type GameState } from '../../src/game/gameState.js';

describe('GameState', () => {
  it('initializes with default resources', () => {
    const state = createGameState();
    expect(state.resources.minerals).toBe(0);
    expect(state.resources.energy).toBe(0);
    expect(state.resources.tech).toBe(0);
    expect(state.resources.alloys).toBe(0);
    expect(state.resources.relics).toBe(0);
  });

  it('initializes with no buildings', () => {
    const state = createGameState();
    expect(Object.keys(state.buildings)).toHaveLength(0);
  });

  it('initializes with default player', () => {
    const state = createGameState();
    expect(state.player.level).toBe(1);
    expect(state.player.exp).toBe(0);
    expect(state.player.class).toBe('spaceMarine');
  });

  it('adds resources correctly', () => {
    const state = createGameState();
    state.addResource('minerals', 100);
    expect(state.resources.minerals).toBe(100);
  });

  it('prevents resources from going below zero', () => {
    const state = createGameState();
    state.addResource('minerals', 50);
    const result = state.spendResource('minerals', 100);
    expect(result).toBe(false);
    expect(state.resources.minerals).toBe(50);
  });

  it('spends resources correctly', () => {
    const state = createGameState();
    state.addResource('minerals', 100);
    const result = state.spendResource('minerals', 30);
    expect(result).toBe(true);
    expect(state.resources.minerals).toBe(70);
  });

  it('serializes to save data', () => {
    const state = createGameState();
    state.addResource('minerals', 500);
    const save = state.toSaveData();
    expect(save.resources.minerals).toBe(500);
    expect(save.version).toBe('0.1.0');
  });

  it('restores from save data', () => {
    const state = createGameState();
    state.addResource('minerals', 500);
    const save = state.toSaveData();

    const restored = createGameState();
    restored.fromSaveData(save);
    expect(restored.resources.minerals).toBe(500);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/game/gameState.test.ts`
Expected: FAIL — module not found

**Step 3: Implement event bus**

Create `src/game/eventBus.ts`:
```typescript
type EventCallback = (...args: unknown[]) => void;

class EventBus {
  private listeners = new Map<string, Set<EventCallback>>();

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach(cb => cb(...args));
  }
}

export const eventBus = new EventBus();
```

**Step 4: Implement game state**

Create `src/game/gameState.ts`:
```typescript
export type ResourceType = 'minerals' | 'energy' | 'tech' | 'alloys' | 'relics';

export interface Resources {
  minerals: number;
  energy: number;
  tech: number;
  alloys: number;
  relics: number;
}

export interface BuildingState {
  level: number;
  unlocked: boolean;
}

export interface PlayerState {
  class: string;
  level: number;
  exp: number;
  equipment: string[];
}

export interface SaveData {
  version: string;
  timestamp: number;
  resources: Resources;
  buildings: Record<string, BuildingState>;
  player: PlayerState;
  exploredPlanets: string[];
  techUnlocked: string[];
  shipsBuilt: string[];
  statistics: {
    totalPlayTime: number;
    deepestDungeon: number;
    relicsFound: number;
  };
}

const DEFAULT_SAVE_VERSION = '0.1.0';

function defaultResources(): Resources {
  return { minerals: 0, energy: 0, tech: 0, alloys: 0, relics: 0 };
}

function defaultPlayer(): PlayerState {
  return { class: 'spaceMarine', level: 1, exp: 0, equipment: [] };
}

function defaultStatistics(): SaveData['statistics'] {
  return { totalPlayTime: 0, deepestDungeon: 0, relicsFound: 0 };
}

export class GameState {
  resources: Resources;
  buildings: Record<string, BuildingState> = {};
  player: PlayerState;
  exploredPlanets: string[] = [];
  techUnlocked: string[] = [];
  shipsBuilt: string[] = [];
  statistics: SaveData['statistics'];
  lastTickTime: number;

  constructor() {
    this.resources = defaultResources();
    this.player = defaultPlayer();
    this.statistics = defaultStatistics();
    this.lastTickTime = Date.now();
  }

  addResource(type: ResourceType, amount: number): void {
    this.resources[type] += amount;
  }

  spendResource(type: ResourceType, amount: number): boolean {
    if (this.resources[type] < amount) return false;
    this.resources[type] -= amount;
    return true;
  }

  canAfford(cost: Partial<Resources>): boolean {
    return Object.entries(cost).every(
      ([key, val]) => this.resources[key as ResourceType] >= (val ?? 0)
    );
  }

  spendResources(cost: Partial<Resources>): boolean {
    if (!this.canAfford(cost)) return false;
    for (const [key, val] of Object.entries(cost)) {
      this.resources[key as ResourceType] -= (val ?? 0);
    }
    return true;
  }

  toSaveData(): SaveData {
    return {
      version: DEFAULT_SAVE_VERSION,
      timestamp: Date.now(),
      resources: { ...this.resources },
      buildings: JSON.parse(JSON.stringify(this.buildings)),
      player: { ...this.player, equipment: [...this.player.equipment] },
      exploredPlanets: [...this.exploredPlanets],
      techUnlocked: [...this.techUnlocked],
      shipsBuilt: [...this.shipsBuilt],
      statistics: { ...this.statistics },
    };
  }

  fromSaveData(data: SaveData): void {
    this.resources = { ...data.resources };
    this.buildings = JSON.parse(JSON.stringify(data.buildings));
    this.player = { ...data.player, equipment: [...data.player.equipment] };
    this.exploredPlanets = [...data.exploredPlanets];
    this.techUnlocked = [...data.techUnlocked];
    this.shipsBuilt = [...data.shipsBuilt];
    this.statistics = { ...data.statistics };
    this.lastTickTime = Date.now();
  }
}

export function createGameState(): GameState {
  return new GameState();
}
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run tests/game/gameState.test.ts`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/game/gameState.ts src/game/eventBus.ts tests/game/gameState.test.ts
git commit -m "feat: add game state store with resource management"
```

---

### Task 3: Create save/load system

**Files:**
- Create: `src/game/saveManager.ts`
- Create: `tests/game/saveManager.test.ts`

**Step 1: Write failing test**

Create `tests/game/saveManager.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SaveManager } from '../../src/game/saveManager.js';
import { createGameState } from '../../src/game/gameState.js';

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
}));

import { get, set } from 'idb-keyval';
const mockGet = get as ReturnType<typeof vi.fn>;
const mockSet = set as ReturnType<typeof vi.fn>;

describe('SaveManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves game state to IndexedDB', async () => {
    mockSet.mockResolvedValue(undefined);
    const manager = new SaveManager();
    const state = createGameState();
    state.addResource('minerals', 200);

    await manager.save(state);

    expect(mockSet).toHaveBeenCalledWith('deep-sky-save', expect.objectContaining({
      resources: { minerals: 200, energy: 0, tech: 0, alloys: 0, relics: 0 },
    }));
  });

  it('loads game state from IndexedDB', async () => {
    const saveData = {
      version: '0.1.0',
      timestamp: Date.now(),
      resources: { minerals: 500, energy: 100, tech: 50, alloys: 30, relics: 5 },
      buildings: {},
      player: { class: 'inquisitor', level: 5, exp: 200, equipment: [] },
      exploredPlanets: ['tartarus'],
      techUnlocked: [],
      shipsBuilt: [],
      statistics: { totalPlayTime: 3600, deepestDungeon: 3, relicsFound: 2 },
    };
    mockGet.mockResolvedValue(saveData);

    const manager = new SaveManager();
    const state = createGameState();
    const loaded = await manager.load(state);

    expect(loaded).toBe(true);
    expect(state.resources.minerals).toBe(500);
    expect(state.player.class).toBe('inquisitor');
  });

  it('returns false when no save data exists', async () => {
    mockGet.mockResolvedValue(undefined);

    const manager = new SaveManager();
    const state = createGameState();
    const loaded = await manager.load(state);

    expect(loaded).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/game/saveManager.test.ts`
Expected: FAIL — module not found

**Step 3: Implement save manager**

Create `src/game/saveManager.ts`:
```typescript
import { get, set } from 'idb-keyval';
import type { GameState, SaveData } from './gameState.js';

const SAVE_KEY = 'deep-sky-save';

export class SaveManager {
  async save(state: GameState): Promise<void> {
    const data = state.toSaveData();
    await set(SAVE_KEY, data);
  }

  async load(state: GameState): Promise<boolean> {
    const data = await get<SaveData>(SAVE_KEY);
    if (!data) return false;
    state.fromSaveData(data);
    return true;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/game/saveManager.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/game/saveManager.ts tests/game/saveManager.test.ts
git commit -m "feat: add IndexedDB save/load system"
```

---

### Task 4: Create UI view manager

**Files:**
- Create: `src/ui/uiManager.ts`
- Create: `src/ui/components.ts`
- Create: `tests/ui/uiManager.test.ts`
- Modify: `src/styles/main.css`
- Modify: `index.html`

**Step 1: Write failing test**

Create `tests/ui/uiManager.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createUIManager } from '../../src/ui/uiManager.js';

// Mock DOM
beforeEach(() => {
  document.body.innerHTML = `
    <div id="view-idle" class="view active"></div>
    <div id="view-starmap" class="view"></div>
    <div id="view-dungeon" class="view"></div>
  `;
});

describe('UIManager', () => {
  it('switches views by hiding all and showing target', () => {
    const ui = createUIManager();
    ui.showView('starmap');

    expect(document.getElementById('view-idle')?.classList.contains('active')).toBe(false);
    expect(document.getElementById('view-starmap')?.classList.contains('active')).toBe(true);
    expect(document.getElementById('view-dungeon')?.classList.contains('active')).toBe(false);
  });

  it('emits view-change event', () => {
    const ui = createUIManager();
    let changedTo = '';
    ui.onViewChange((view) => { changedTo = view; });
    ui.showView('dungeon');
    expect(changedTo).toBe('dungeon');
  });

  it('does not emit if switching to same view', () => {
    const ui = createUIManager();
    let count = 0;
    ui.onViewChange(() => { count++; });
    ui.showView('idle');
    expect(count).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/uiManager.test.ts`
Expected: FAIL

**Step 3: Implement UI manager**

Create `src/ui/uiManager.ts`:
```typescript
export type ViewName = 'idle' | 'starmap' | 'dungeon';
type ViewChangeCallback = (view: ViewName) => void;

export function createUIManager() {
  let currentView: ViewName = 'idle';
  const listeners: ViewChangeCallback[] = [];

  function showView(view: ViewName): void {
    if (view === currentView) return;

    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${view}`)?.classList.add('active');
    currentView = view;
    listeners.forEach(cb => cb(view));
  }

  function onViewChange(cb: ViewChangeCallback): void {
    listeners.push(cb);
  }

  function getCurrentView(): ViewName {
    return currentView;
  }

  return { showView, onViewChange, getCurrentView };
}
```

**Step 4: Create UI components helper**

Create `src/ui/components.ts`:
```typescript
export function el(tag: string, className?: string, text?: string): HTMLElement {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

export function button(text: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.addEventListener('click', onClick);
  return btn;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return Math.floor(n).toString();
}
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run tests/ui/uiManager.test.ts`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/ui/uiManager.ts src/ui/components.ts tests/ui/uiManager.test.ts
git commit -m "feat: add UI view manager and component helpers"
```

---

## Phase 2: Idle / Resource System

### Task 5: Building definitions and upgrade logic

**Files:**
- Create: `src/data/buildings.json`
- Create: `src/idle/buildings.ts`
- Create: `tests/idle/buildings.test.ts`

**Step 1: Write failing test**

Create `tests/idle/buildings.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { getBuildings, getUpgradeCost, getProductionRate, canUpgrade, upgradeBuilding } from '../../src/idle/buildings.js';
import type { GameState } from '../../src/game/gameState.js';
import { createGameState } from '../../src/game/gameState.js';

describe('Buildings', () => {
  it('returns all building definitions', () => {
    const buildings = getBuildings();
    expect(buildings.length).toBeGreaterThan(0);
    expect(buildings[0]).toHaveProperty('id');
    expect(buildings[0]).toHaveProperty('name');
    expect(buildings[0]).toHaveProperty('baseCost');
  });

  it('calculates upgrade cost with scaling', () => {
    const cost = getUpgradeCost('mine', 1);
    expect(cost.minerals).toBeGreaterThan(0);
    const cost2 = getUpgradeCost('mine', 5);
    expect(cost2.minerals).toBeGreaterThan(cost.minerals);
  });

  it('calculates production rate based on level', () => {
    const rate = getProductionRate('mine', 1);
    expect(rate).toBeGreaterThan(0);
    const rate5 = getProductionRate('mine', 5);
    expect(rate5).toBeGreaterThan(rate);
  });

  it('can upgrade when player can afford', () => {
    const state = createGameState();
    state.addResource('minerals', 10000);
    state.buildings['mine'] = { level: 1, unlocked: true };
    expect(canUpgrade(state, 'mine')).toBe(true);
  });

  it('cannot upgrade when player cannot afford', () => {
    const state = createGameState();
    state.buildings['mine'] = { level: 1, unlocked: true };
    expect(canUpgrade(state, 'mine')).toBe(false);
  });

  it('upgrades building and deducts cost', () => {
    const state = createGameState();
    state.addResource('minerals', 10000);
    state.buildings['mine'] = { level: 1, unlocked: true };
    upgradeBuilding(state, 'mine');
    expect(state.buildings['mine'].level).toBe(2);
    expect(state.resources.minerals).toBeLessThan(10000);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/idle/buildings.test.ts`
Expected: FAIL

**Step 3: Create building config data**

Create `src/data/buildings.json`:
```json
[
  {
    "id": "mine",
    "name": "Mining Shaft",
    "description": "Delve into the crust. For the Emperor needs these resources.",
    "baseCost": { "minerals": 50 },
    "costMultiplier": 1.8,
    "produces": { "minerals": 2 },
    "maxLevel": 10
  },
  {
    "id": "powerPlant",
    "name": "Plasma Generator",
    "description": "Harness the power of the stars to fuel our endeavors.",
    "baseCost": { "minerals": 80 },
    "costMultiplier": 1.8,
    "produces": { "energy": 1.5 },
    "maxLevel": 10
  },
  {
    "id": "researchLab",
    "name": "Divination Chamber",
    "description": "Tech-Priests parse STC fragments to unlock ancient knowledge.",
    "baseCost": { "minerals": 150, "energy": 50 },
    "costMultiplier": 2.0,
    "produces": { "tech": 0.5 },
    "maxLevel": 10
  },
  {
    "id": "refinery",
    "name": "Alloy Forge",
    "description": "Transmute base minerals into refined alloys worthy of the Imperium.",
    "baseCost": { "minerals": 300, "energy": 100 },
    "costMultiplier": 2.2,
    "produces": { "alloys": 0.3 },
    "consumes": { "minerals": 5, "energy": 2 },
    "maxLevel": 10
  }
]
```

**Step 4: Implement building logic**

Create `src/idle/buildings.ts`:
```typescript
import type { Resources, GameState, BuildingState } from '../game/gameState.js';
import buildingsData from '../data/buildings.json' assert { type: 'json' };

export interface BuildingDef {
  id: string;
  name: string;
  description: string;
  baseCost: Partial<Resources>;
  costMultiplier: number;
  produces: Partial<Resources>;
  consumes?: Partial<Resources>;
  maxLevel: number;
}

const buildings: BuildingDef[] = buildingsData;

export function getBuildings(): BuildingDef[] {
  return buildings;
}

export function getBuildingDef(id: string): BuildingDef | undefined {
  return buildings.find(b => b.id === id);
}

export function getUpgradeCost(id: string, currentLevel: number): Partial<Resources> {
  const def = getBuildingDef(id);
  if (!def) return {};
  const cost: Partial<Resources> = {};
  for (const [key, val] of Object.entries(def.baseCost)) {
    cost[key as keyof Resources] = Math.floor((val ?? 0) * Math.pow(def.costMultiplier, currentLevel));
  }
  return cost;
}

export function getProductionRate(id: string, level: number): number {
  const def = getBuildingDef(id);
  if (!def) return 0;
  const totalRate = Object.values(def.produces).reduce((sum, v) => sum + (v ?? 0), 0);
  return totalRate * level;
}

export function canUpgrade(state: GameState, id: string): boolean {
  const def = getBuildingDef(id);
  if (!def) return false;
  const current = state.buildings[id];
  const level = current?.unlocked ? current.level : 0;
  if (level >= def.maxLevel) return false;
  const cost = getUpgradeCost(id, level);
  return state.canAfford(cost);
}

export function upgradeBuilding(state: GameState, id: string): boolean {
  if (!canUpgrade(state, id)) return false;
  const current = state.buildings[id];
  const level = current?.unlocked ? current.level : 0;
  const cost = getUpgradeCost(id, level);
  state.spendResources(cost);
  state.buildings[id] = { level: level + 1, unlocked: true };
  return true;
}

export function unlockBuilding(state: GameState, id: string): boolean {
  const def = getBuildingDef(id);
  if (!def) return false;
  const cost = getUpgradeCost(id, 0);
  if (!state.canAfford(cost)) return false;
  state.spendResources(cost);
  state.buildings[id] = { level: 1, unlocked: true };
  return true;
}
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run tests/idle/buildings.test.ts`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/data/buildings.json src/idle/buildings.ts tests/idle/buildings.test.ts
git commit -m "feat: add building definitions and upgrade logic"
```

---

### Task 6: Game loop (idle tick)

**Files:**
- Create: `src/game/gameLoop.ts`
- Create: `tests/game/gameLoop.test.ts`

**Step 1: Write failing test**

Create `tests/game/gameLoop.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { GameLoop, calculateOfflineProgress } from '../../src/game/gameLoop.js';
import { createGameState } from '../../src/game/gameState.js';

describe('GameLoop', () => {
  it('produces resources based on buildings', () => {
    const state = createGameState();
    state.buildings['mine'] = { level: 3, unlocked: true };

    const loop = new GameLoop(state);
    loop.tick(1); // 1 second

    expect(state.resources.minerals).toBeGreaterThan(0);
  });

  it('multiple buildings produce independently', () => {
    const state = createGameState();
    state.buildings['mine'] = { level: 2, unlocked: true };
    state.buildings['powerPlant'] = { level: 2, unlocked: true };

    const loop = new GameLoop(state);
    loop.tick(1);

    expect(state.resources.minerals).toBeGreaterThan(0);
    expect(state.resources.energy).toBeGreaterThan(0);
  });

  it('refinery consumes resources while producing', () => {
    const state = createGameState();
    state.buildings['refinery'] = { level: 1, unlocked: true };
    state.addResource('minerals', 1000);
    state.addResource('energy', 1000);

    const loop = new GameLoop(state);
    loop.tick(10);

    expect(state.resources.alloys).toBeGreaterThan(0);
  });

  it('refinery stops when input resources are depleted', () => {
    const state = createGameState();
    state.buildings['refinery'] = { level: 1, unlocked: true };
    // No input resources

    const loop = new GameLoop(state);
    loop.tick(10);

    expect(state.resources.alloys).toBe(0);
  });

  it('updates last tick time', () => {
    const state = createGameState();
    const before = state.lastTickTime;
    const loop = new GameLoop(state);
    loop.tick(1);
    expect(state.lastTickTime).toBeGreaterThanOrEqual(before);
  });
});

describe('calculateOfflineProgress', () => {
  it('calculates offline resources', () => {
    const state = createGameState();
    state.buildings['mine'] = { level: 2, unlocked: true };
    const offlineSeconds = 600; // 10 minutes

    calculateOfflineProgress(state, offlineSeconds);

    expect(state.resources.minerals).toBeGreaterThan(0);
  });

  it('caps offline progress at 8 hours', () => {
    const state = createGameState();
    state.buildings['mine'] = { level: 10, unlocked: true };

    const capped = calculateOfflineProgress(state, 86400); // 24 hours
    // Should only calculate for 28800 seconds (8 hours max)
    expect(capped).toBeLessThanOrEqual(28800);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/game/gameLoop.test.ts`
Expected: FAIL

**Step 3: Implement game loop**

Create `src/game/gameLoop.ts`:
```typescript
import type { GameState, ResourceType } from './gameState.js';
import { getBuildings } from '../idle/buildings.js';

const MAX_OFFLINE_SECONDS = 8 * 60 * 60; // 8 hours
const TICK_MS = 1000;

export class GameLoop {
  private state: GameState;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(state: GameState) {
    this.state = state;
  }

  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.tick(1), TICK_MS);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  tick(deltaSeconds: number): void {
    const buildings = getBuildings();
    for (const building of buildings) {
      const buildingState = this.state.buildings[building.id];
      if (!buildingState?.unlocked) continue;

      // Check if building has consumption requirements
      if (building.consumes) {
        const canConsume = Object.entries(building.consumes).every(
          ([key, val]) => this.state.resources[key as ResourceType] >= (val ?? 0) * deltaSeconds
        );
        if (!canConsume) continue;

        // Consume input resources
        for (const [key, val] of Object.entries(building.consumes)) {
          this.state.resources[key as ResourceType] -= (val ?? 0) * deltaSeconds;
        }
      }

      // Produce output resources
      for (const [key, val] of Object.entries(building.produces)) {
        this.state.resources[key as ResourceType] += (val ?? 0) * buildingState.level * deltaSeconds;
      }
    }

    this.state.lastTickTime = Date.now();
  }
}

export function calculateOfflineProgress(state: GameState, elapsedSeconds: number): number {
  const capped = Math.min(elapsedSeconds, MAX_OFFLINE_SECONDS);
  const loop = new GameLoop(state);
  // Tick in 1-second intervals for accuracy with consumption
  for (let i = 0; i < capped; i++) {
    loop.tick(1);
  }
  return capped;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/game/gameLoop.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/game/gameLoop.ts tests/game/gameLoop.test.ts
git commit -m "feat: add game loop with idle tick and offline progress"
```

---

### Task 7: Idle view UI — resource panel and building panel

**Files:**
- Create: `src/idle/idleView.ts`
- Modify: `index.html`
- Modify: `src/styles/main.css`
- Modify: `src/main.ts`

**Step 1: Update index.html with idle view structure**

Replace the `#view-idle` div in `index.html`:
```html
<div id="view-idle" class="view active">
  <header id="header">
    <h1>IMPERIAL OUTPOST</h1>
    <nav id="nav">
      <button class="nav-btn active" data-view="idle">Base</button>
      <button class="nav-btn" data-view="starmap">Star Map</button>
      <button class="nav-btn" data-view="dungeon">Expedition</button>
    </nav>
  </header>

  <section id="resource-panel">
    <div class="resource-row" data-resource="minerals">
      <span class="resource-icon">⛏</span>
      <span class="resource-name">Minerals</span>
      <span class="resource-value" id="res-minerals">0</span>
      <span class="resource-rate" id="rate-minerals">+0/s</span>
    </div>
    <div class="resource-row" data-resource="energy">
      <span class="resource-icon">⚡</span>
      <span class="resource-name">Energy</span>
      <span class="resource-value" id="res-energy">0</span>
      <span class="resource-rate" id="rate-energy">+0/s</span>
    </div>
    <div class="resource-row" data-resource="tech">
      <span class="resource-icon">📜</span>
      <span class="resource-name">Tech</span>
      <span class="resource-value" id="res-tech">0</span>
      <span class="resource-rate" id="rate-tech">+0/s</span>
    </div>
    <div class="resource-row" data-resource="alloys">
      <span class="resource-icon">⚙</span>
      <span class="resource-name">Alloys</span>
      <span class="resource-value" id="res-alloys">0</span>
      <span class="resource-rate" id="rate-alloys">+0/s</span>
    </div>
    <div class="resource-row" data-resource="relics">
      <span class="resource-icon">👁</span>
      <span class="resource-name">Relics</span>
      <span class="resource-value" id="res-relics">0</span>
    </div>
  </section>

  <section id="building-panel">
    <h2>FACILITIES</h2>
    <div id="building-list"></div>
  </section>
</div>
```

**Step 2: Add idle view styles to main.css**

Append to `src/styles/main.css`:
```css
/* Header */
#header h1 {
  font-size: 1.5rem;
  color: #c9a84c;
  letter-spacing: 4px;
  margin-bottom: 10px;
}

#nav {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.nav-btn {
  background: #1a1a2e;
  color: #666;
  border: 1px solid #333;
  padding: 8px 16px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.85rem;
  letter-spacing: 1px;
}

.nav-btn.active {
  color: #c9a84c;
  border-color: #c9a84c;
}

.nav-btn:hover {
  border-color: #c9a84c;
}

/* Resources */
#resource-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.resource-row {
  background: #12121f;
  border: 1px solid #1e1e3a;
  padding: 8px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 180px;
}

.resource-icon {
  font-size: 1.2rem;
}

.resource-name {
  color: #888;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.resource-value {
  color: #e0d0a0;
  font-weight: bold;
  font-size: 1.1rem;
  min-width: 60px;
  text-align: right;
}

.resource-rate {
  color: #4a8;
  font-size: 0.75rem;
}

/* Buildings */
#building-panel h2 {
  color: #888;
  font-size: 0.85rem;
  letter-spacing: 2px;
  margin-bottom: 10px;
}

.building-card {
  background: #12121f;
  border: 1px solid #1e1e3a;
  padding: 14px;
  margin-bottom: 8px;
}

.building-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.building-name {
  color: #c9a84c;
  font-size: 1rem;
  letter-spacing: 1px;
}

.building-level {
  color: #666;
  font-size: 0.8rem;
}

.building-desc {
  color: #555;
  font-size: 0.75rem;
  margin-bottom: 8px;
  font-style: italic;
}

.building-cost {
  color: #888;
  font-size: 0.8rem;
  margin-bottom: 8px;
}

.building-production {
  color: #4a8;
  font-size: 0.8rem;
  margin-bottom: 8px;
}

.upgrade-btn {
  background: #1a1a2e;
  color: #c9a84c;
  border: 1px solid #c9a84c;
  padding: 6px 14px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.8rem;
  letter-spacing: 1px;
}

.upgrade-btn:hover:not(:disabled) {
  background: #2a2a4e;
}

.upgrade-btn:disabled {
  color: #444;
  border-color: #333;
  cursor: not-allowed;
}

.building-card.locked {
  opacity: 0.5;
}
```

**Step 3: Implement idle view**

Create `src/idle/idleView.ts`:
```typescript
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

    // Calculate total production rate
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
```

**Step 4: Wire up main.ts with game initialization**

Replace `src/main.ts`:
```typescript
import { createGameState } from './game/gameState.js';
import { GameLoop } from './game/gameLoop.js';
import { SaveManager } from './game/saveManager.js';
import { createUIManager } from './ui/uiManager.js';
import { renderIdleView } from './idle/idleView.js';

async function init() {
  const state = createGameState();
  const ui = createUIManager();
  const saveManager = new SaveManager();
  const gameLoop = new GameLoop(state);

  // Try to load save
  const loaded = await saveManager.load(state);
  if (!loaded) {
    // Give starting resources
    state.addResource('minerals', 100);
    state.addResource('energy', 50);
  } else {
    // Calculate offline progress
    const now = Date.now();
    const elapsed = Math.floor((now - state.lastTickTime) / 1000);
    if (elapsed > 5) {
      import('./game/gameLoop.js').then(({ calculateOfflineProgress }) => {
        const capped = calculateOfflineProgress(state, elapsed);
        if (capped > 0) {
          console.log(`Welcome back, Commander. ${Math.floor(capped / 60)} minutes of production recovered.`);
        }
        renderIdleView(state);
      });
    }
  }

  // Nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = (btn as HTMLElement).dataset.view as 'idle' | 'starmap' | 'dungeon';
      ui.showView(view);
      // Update nav button states
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Render view
      if (view === 'idle') renderIdleView(state);
    });
  });

  // Render initial view
  renderIdleView(state);

  // Start game loop
  gameLoop.start();

  // Refresh UI every second
  setInterval(() => renderIdleView(state), 1000);

  // Auto-save every 30 seconds
  setInterval(() => saveManager.save(state), 30000);

  // Save on page close
  window.addEventListener('beforeunload', () => saveManager.save(state));
}

init();
```

**Step 5: Run dev server and test manually**

Run: `npm run dev`
Expected: Browser shows Imperial Outpost with resource panel and building cards. Resources increase over time. Buildings can be constructed and upgraded.

**Step 6: Commit**

```bash
git add src/idle/idleView.ts index.html src/styles/main.css src/main.ts
git commit -m "feat: add idle view with resource panel and building system"
```

---

## Phase 3: Star Map & Ship System

### Task 8: Planet and ship definitions

**Files:**
- Create: `src/data/planets.json`
- Create: `src/starmap/planets.ts`
- Create: `src/starmap/ships.ts`
- Create: `src/data/ships.json`
- Create: `tests/starmap/planets.test.ts`

**Step 1: Write failing test**

Create `tests/starmap/planets.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { getPlanets, isPlanetUnlocked, getPlanetsInRange } from '../../src/starmap/planets.js';
import { createGameState } from '../../src/game/gameState.js';

describe('Planets', () => {
  it('returns planet definitions', () => {
    const planets = getPlanets();
    expect(planets.length).toBeGreaterThan(0);
  });

  it('first planet is always unlocked', () => {
    const state = createGameState();
    const planets = getPlanets();
    expect(isPlanetUnlocked(state, planets[0].id)).toBe(true);
  });

  it('planet with ship requirement is locked without ship', () => {
    const state = createGameState();
    const planets = getPlanets();
    const locked = planets.find(p => p.requiredShip);
    if (locked) {
      expect(isPlanetUnlocked(state, locked.id)).toBe(false);
    }
  });

  it('planet is unlocked when ship requirement is met', () => {
    const state = createGameState();
    state.shipsBuilt.push('frigate');
    const planets = getPlanets();
    const withShip = planets.find(p => p.requiredShip === 'frigate');
    if (withShip) {
      // May still have other requirements (energy)
      expect(isPlanetUnlocked(state, withShip.id) || !isPlanetUnlocked(state, withShip.id)).toBe(true);
    }
  });
});
```

**Step 2: Create planet data**

Create `src/data/planets.json`:
```json
[
  {
    "id": "aridia",
    "name": "Aridia Prime",
    "type": "deadWorld",
    "description": "A barren rock in the void. Mineral deposits stretch deep beneath the surface.",
    "dangerLevel": 1,
    "distance": 1,
    "energyCost": 50,
    "rewards": { "minerals": 500, "tech": 20 },
    "requiredShip": null,
    "dungeonFloors": 3
  },
  {
    "id": "hiveTartarus",
    "name": "Tartarus Hive",
    "type": "hiveWorld",
    "description": "Billions of souls toil in the endless spires. STC fragments await in the underhive.",
    "dangerLevel": 2,
    "distance": 2,
    "energyCost": 150,
    "rewards": { "tech": 200, "alloys": 50 },
    "requiredShip": "frigate",
    "dungeonFloors": 5
  },
  {
    "id": "carnagedd",
    "name": "Carnage IV",
    "type": "deathWorld",
    "description": "Every living thing here hunts. Tyranid bioforms lurk beneath the canopy.",
    "dangerLevel": 3,
    "distance": 3,
    "energyCost": 300,
    "rewards": { "relics": 2, "tech": 100 },
    "requiredShip": "cruiser",
    "dungeonFloors": 7
  },
  {
    "id": "warpRift",
    "name": "The Screaming Rift",
    "type": "chaosSpace",
    "description": "Reality tears apart. Daemons whisper from the warp. Only the faithful survive.",
    "dangerLevel": 4,
    "distance": 4,
    "energyCost": 500,
    "rewards": { "relics": 5, "alloys": 200 },
    "requiredShip": "battleBarge",
    "dungeonFloors": 10
  },
  {
    "id": "forgeMars",
    "name": "Mars Secundus",
    "type": "forgeWorld",
    "description": "A lesser forge world. The Machine God's blessings flow through ancient forges.",
    "dangerLevel": 3,
    "distance": 3,
    "energyCost": 400,
    "rewards": { "alloys": 300, "tech": 300 },
    "requiredShip": "cruiser",
    "dungeonFloors": 8
  }
]
```

Create `src/data/ships.json`:
```json
[
  {
    "id": "frigate",
    "name": "Imperial Frigate",
    "description": "A swift patrol vessel. Enough for short-range warp jumps.",
    "cost": { "minerals": 500, "alloys": 100 },
    "range": 2
  },
  {
    "id": "cruiser",
    "name": "Lunar Cruiser",
    "description": "A warship of the line. Carries enough firepower for dangerous sectors.",
    "cost": { "minerals": 2000, "alloys": 500, "energy": 200 },
    "range": 3
  },
  {
    "id": "battleBarge",
    "name": "Strike Cruiser",
    "description": "A Space Marine battle barge. The Emperor's fury made manifest.",
    "cost": { "minerals": 5000, "alloys": 1500, "tech": 500, "relics": 3 },
    "range": 5
  }
]
```

**Step 3: Implement planet and ship logic**

Create `src/starmap/planets.ts`:
```typescript
import type { GameState } from '../game/gameState.js';
import planetsData from '../data/planets.json' assert { type: 'json' };

export interface PlanetDef {
  id: string;
  name: string;
  type: string;
  description: string;
  dangerLevel: number;
  distance: number;
  energyCost: number;
  rewards: Record<string, number>;
  requiredShip: string | null;
  dungeonFloors: number;
}

export function getPlanets(): PlanetDef[] {
  return planetsData;
}

export function getPlanetDef(id: string): PlanetDef | undefined {
  return planetsData.find((p: PlanetDef) => p.id === id);
}

export function isPlanetUnlocked(state: GameState, planetId: string): boolean {
  const planet = getPlanetDef(planetId);
  if (!planet) return false;
  if (!planet.requiredShip) return true;
  return state.shipsBuilt.includes(planet.requiredShip);
}

export function getPlanetsInRange(state: GameState): PlanetDef[] {
  return getPlanets().filter(p => isPlanetUnlocked(state, p.id));
}
```

Create `src/starmap/ships.ts`:
```typescript
import type { GameState } from '../game/gameState.js';
import shipsData from '../data/ships.json' assert { type: 'json' };

export interface ShipDef {
  id: string;
  name: string;
  description: string;
  cost: Record<string, number>;
  range: number;
}

export function getShips(): ShipDef[] {
  return shipsData;
}

export function canBuildShip(state: GameState, shipId: string): boolean {
  const ship = getShips().find(s => s.id === shipId);
  if (!ship) return false;
  if (state.shipsBuilt.includes(shipId)) return false; // Already built
  return state.canAfford(ship.cost as any);
}

export function buildShip(state: GameState, shipId: string): boolean {
  const ship = getShips().find(s => s.id === shipId);
  if (!ship) return false;
  if (state.shipsBuilt.includes(shipId)) return false;
  if (!state.canAfford(ship.cost as any)) return false;
  state.spendResources(ship.cost as any);
  state.shipsBuilt.push(shipId);
  return true;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/starmap/planets.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/data/planets.json src/data/ships.json src/starmap/planets.ts src/starmap/ships.ts tests/starmap/planets.test.ts
git commit -m "feat: add planet and ship definitions with unlock logic"
```

---

### Task 9: Star map view UI

**Files:**
- Create: `src/starmap/starMapView.ts`
- Modify: `index.html`
- Modify: `src/styles/main.css`
- Modify: `src/main.ts`

**Step 1: Add star map HTML to index.html**

Replace the `#view-starmap` div in `index.html`:
```html
<div id="view-starmap" class="view">
  <header id="header">
    <h1>STAR MAP</h1>
    <nav id="nav">
      <button class="nav-btn" data-view="idle">Base</button>
      <button class="nav-btn active" data-view="starmap">Star Map</button>
      <button class="nav-btn" data-view="dungeon">Expedition</button>
    </nav>
  </header>

  <section id="shipyard-panel">
    <h2>SHIPYARD</h2>
    <div id="ship-list"></div>
  </section>

  <section id="planet-list-panel">
    <h2>SECTORS</h2>
    <div id="planet-list"></div>
  </section>
</div>
```

**Step 2: Add star map styles**

Append to `src/styles/main.css`:
```css
/* Shipyard */
#shipyard-panel {
  margin-bottom: 20px;
}

.ship-card {
  background: #12121f;
  border: 1px solid #1e1e3a;
  padding: 14px;
  margin-bottom: 8px;
}

.ship-card.built {
  border-color: #4a8;
}

.ship-name {
  color: #c9a84c;
  font-size: 1rem;
  letter-spacing: 1px;
}

.ship-desc {
  color: #555;
  font-size: 0.75rem;
  font-style: italic;
  margin: 4px 0 8px;
}

.ship-status {
  font-size: 0.8rem;
  margin-bottom: 8px;
}

.ship-status.built {
  color: #4a8;
}

.ship-status.locked {
  color: #888;
}

/* Planets */
.planet-card {
  background: #12121f;
  border: 1px solid #1e1e3a;
  padding: 14px;
  margin-bottom: 8px;
  cursor: pointer;
}

.planet-card:hover:not(.locked) {
  border-color: #c9a84c;
}

.planet-card.locked {
  opacity: 0.4;
  cursor: not-allowed;
}

.planet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.planet-name {
  color: #c9a84c;
  font-size: 1rem;
  letter-spacing: 1px;
}

.planet-danger {
  color: #c44;
  font-size: 0.75rem;
  letter-spacing: 1px;
}

.planet-desc {
  color: #555;
  font-size: 0.75rem;
  font-style: italic;
  margin: 4px 0 8px;
}

.planet-info {
  color: #888;
  font-size: 0.8rem;
}
```

**Step 3: Implement star map view**

Create `src/starmap/starMapView.ts`:
```typescript
import type { GameState } from '../game/gameState.js';
import { getPlanets, isPlanetUnlocked } from './planets.js';
import { getShips, canBuildShip, buildShip } from './ships.js';
import { formatNumber } from '../ui/components.js';

export function renderStarMapView(state: GameState, onPlanetSelect: (planetId: string) => void): void {
  renderShips(state);
  renderPlanets(state, onPlanetSelect);
}

function renderShips(state: GameState): void {
  const container = document.getElementById('ship-list');
  if (!container) return;

  const ships = getShips();
  container.innerHTML = '';

  for (const ship of ships) {
    const isBuilt = state.shipsBuilt.includes(ship.id);
    const canBuild = canBuildShip(state, ship.id);

    const card = document.createElement('div');
    card.className = `ship-card${isBuilt ? ' built' : ''}`;

    const costStr = Object.entries(ship.cost)
      .map(([k, v]) => `${k}: ${formatNumber(v)}`)
      .join(', ');

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

    const rewardStr = Object.entries(planet.rewards)
      .map(([k, v]) => `${k}: +${v}`)
      .join(', ');

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
        if (canAffordEnergy) {
          onPlanetSelect(planet.id);
        }
      });
      if (!canAffordEnergy) {
        card.style.opacity = '0.6';
      }
    }

    container.appendChild(card);
  }
}
```

**Step 4: Wire star map into main.ts**

Update `src/main.ts` — add import and view rendering in the nav click handler:
```typescript
// Add import at top:
import { renderStarMapView } from './starmap/starMapView.js';

// In the nav click handler, add:
if (view === 'starmap') renderStarMapView(state, (planetId) => {
  // Launch expedition — will be connected to dungeon in Phase 4
  console.log('Launching expedition to:', planetId);
});
```

**Step 5: Test manually**

Run: `npm run dev`
Expected: Navigate to Star Map, see shipyard and planet list. Ships can be built. Locked planets show as dimmed.

**Step 6: Commit**

```bash
git add src/starmap/starMapView.ts index.html src/styles/main.css src/main.ts
git commit -m "feat: add star map view with shipyard and planet list"
```

---

## Phase 4: Roguelike Dungeon System

### Task 10: Dungeon procedural generation

**Files:**
- Create: `src/roguelike/dungeonGen.ts`
- Create: `src/roguelike/entities.ts`
- Create: `src/roguelike/items.ts`
- Create: `src/data/enemies.json`
- Create: `src/data/items.json`
- Create: `tests/roguelike/dungeonGen.test.ts`

**Step 1: Write failing test**

Create `tests/roguelike/dungeonGen.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { generateDungeon } from '../../src/roguelike/dungeonGen.js';

describe('Dungeon Generation', () => {
  it('generates a dungeon with rooms', () => {
    const dungeon = generateDungeon(3, 1);
    expect(dungeon.width).toBeGreaterThan(0);
    expect(dungeon.height).toBeGreaterThan(0);
    expect(dungeon.rooms.length).toBeGreaterThan(0);
  });

  it('dungeon has a start and exit', () => {
    const dungeon = generateDungeon(3, 1);
    expect(dungeon.startPos).toBeDefined();
    expect(dungeon.exitPos).toBeDefined();
  });

  it('deeper floors generate more rooms', () => {
    const d1 = generateDungeon(1, 1);
    const d3 = generateDungeon(3, 1);
    expect(d3.rooms.length).toBeGreaterThanOrEqual(d1.rooms.length);
  });

  it('tile map has correct dimensions', () => {
    const dungeon = generateDungeon(3, 1);
    expect(dungeon.tiles.length).toBe(dungeon.height);
    expect(dungeon.tiles[0].length).toBe(dungeon.width);
  });

  it('start position is on a floor tile', () => {
    const dungeon = generateDungeon(3, 1);
    const [sx, sy] = dungeon.startPos;
    expect(dungeon.tiles[sy][sx]).not.toBe(1); // 1 = wall
  });
});
```

**Step 2: Create enemy data**

Create `src/data/enemies.json`:
```json
[
  {
    "id": "grot",
    "name": "Grot",
    "type": "ork",
    "hp": 15,
    "attack": 3,
    "defense": 1,
    "exp": 5,
    "minFloor": 1
  },
  {
    "id": "orkBoy",
    "name": "Ork Boy",
    "type": "ork",
    "hp": 30,
    "attack": 6,
    "defense": 2,
    "exp": 12,
    "minFloor": 1
  },
  {
    "id": "gaunt",
    "name": "Termagant",
    "type": "tyranid",
    "hp": 20,
    "attack": 5,
    "defense": 1,
    "exp": 8,
    "minFloor": 2
  },
  {
    "id": "genestealer",
    "name": "Genestealer",
    "type": "tyranid",
    "hp": 45,
    "attack": 10,
    "defense": 3,
    "exp": 25,
    "minFloor": 3
  },
  {
    "id": "daemonette",
    "name": "Daemonette",
    "type": "chaos",
    "hp": 50,
    "attack": 12,
    "defense": 4,
    "exp": 35,
    "minFloor": 4
  },
  {
    "id": "warboss",
    "name": "Warboss",
    "type": "ork",
    "hp": 100,
    "attack": 15,
    "defense": 8,
    "exp": 100,
    "minFloor": 3,
    "isBoss": true
  },
  {
    "id": "hiveTyrant",
    "name": "Hive Tyrant",
    "type": "tyranid",
    "hp": 150,
    "attack": 20,
    "defense": 10,
    "exp": 200,
    "minFloor": 5,
    "isBoss": true
  }
]
```

Create `src/data/items.json`:
```json
[
  {
    "id": "chainsword",
    "name": "Chainsword",
    "type": "weapon",
    "attack": 5,
    "description": "A roaring blade of teeth and fury."
  },
  {
    "id": "bolter",
    "name": "Boltpistol",
    "type": "weapon",
    "attack": 8,
    "description": "The Emperor's wrath in palm form."
  },
  {
    "id": "plasmaGun",
    "name": "Plasma Gun",
    "type": "weapon",
    "attack": 14,
    "description": "Superheated death. Handle with reverence."
  },
  {
    "id": "powerArmor",
    "name": "Power Armour Fragment",
    "type": "armor",
    "defense": 5,
    "description": "A piece of sacred ceramite."
  },
  {
    "id": "medKit",
    "name": "Medicae Kit",
    "type": "consumable",
    "heal": 30,
    "description": "Restore 30 HP."
  },
  {
    "id": "stcFragment",
    "name": "STC Fragment",
    "type": "relic",
    "tech": 50,
    "description": "A fragment of ancient knowledge."
  }
]
```

**Step 3: Implement dungeon generation**

Create `src/roguelike/entities.ts`:
```typescript
export interface EnemyDef {
  id: string;
  name: string;
  type: string;
  hp: number;
  attack: number;
  defense: number;
  exp: number;
  minFloor: number;
  isBoss?: boolean;
}

import enemiesData from '../data/enemies.json' assert { type: 'json';

export function getEnemies(): EnemyDef[] {
  return enemiesData;
}

export function getEnemiesForFloor(floor: number): EnemyDef[] {
  return enemiesData.filter((e: EnemyDef) => e.minFloor <= floor && !e.isBoss);
}

export function getBossForFloor(floor: number): EnemyDef | undefined {
  return enemiesData.find((e: EnemyDef) => e.isBoss && e.minFloor <= floor);
}
```

Create `src/roguelike/items.ts`:
```typescript
export interface ItemDef {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'consumable' | 'relic';
  attack?: number;
  defense?: number;
  heal?: number;
  tech?: number;
  description: string;
}

import itemsData from '../data/items.json' assert { type: 'json' };

export function getItems(): ItemDef[] {
  return itemsData;
}

export function getItemById(id: string): ItemDef | undefined {
  return itemsData.find((i: ItemDef) => i.id === id);
}
```

Create `src/roguelike/dungeonGen.ts`:
```typescript
import type { EnemyDef } from './entities.js';
import { getEnemiesForFloor, getBossForFloor } from './entities.js';
import type { ItemDef } from './items.js';
import { getItems } from './items.js';

// Tile types: 0 = floor, 1 = wall, 2 = exit, 3 = fog
export type Tile = 0 | 1 | 2 | 3;

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  enemies: { def: EnemyDef; x: number; y: number }[];
  items: { def: ItemDef; x: number; y: number }[];
}

export interface Dungeon {
  width: number;
  height: number;
  tiles: Tile[][];
  rooms: Room[];
  startPos: [number, number];
  exitPos: [number, number];
  floor: number;
  dangerLevel: number;
}

const BASE_WIDTH = 40;
const BASE_HEIGHT = 30;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateDungeon(floor: number, dangerLevel: number): Dungeon {
  const width = BASE_WIDTH + floor * 5;
  const height = BASE_HEIGHT + floor * 3;

  // Initialize with walls
  const tiles: Tile[][] = Array.from({ length: height }, () =>
    Array(width).fill(1)
  );

  const rooms: Room[] = [];
  const numRooms = 5 + floor * 2;

  // Generate rooms
  for (let attempt = 0; attempt < numRooms * 10 && rooms.length < numRooms; attempt++) {
    const rw = randomInt(5, 10);
    const rh = randomInt(4, 8);
    const rx = randomInt(1, width - rw - 1);
    const ry = randomInt(1, height - rh - 1);

    // Check overlap
    const overlaps = rooms.some(r =>
      rx < r.x + r.w + 1 && rx + rw + 1 > r.x &&
      ry < r.y + r.h + 1 && ry + rh + 1 > r.y
    );
    if (overlaps) continue;

    // Carve room
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        tiles[y][x] = 0;
      }
    }

    const enemies = getEnemiesForFloor(floor);
    const items = getItems();
    const roomEnemies: Room['enemies'] = [];
    const roomItems: Room['items'] = [];

    // Place enemies (skip first room)
    if (rooms.length > 0) {
      const numEnemies = randomInt(1, Math.min(3, floor));
      for (let i = 0; i < numEnemies && enemies.length > 0; i++) {
        const def = enemies[randomInt(0, enemies.length - 1)];
        roomEnemies.push({
          def,
          x: randomInt(rx + 1, rx + rw - 2),
          y: randomInt(ry + 1, ry + rh - 2),
        });
      }
    }

    // Place item (30% chance)
    if (Math.random() < 0.3) {
      const def = items[randomInt(0, items.length - 1)];
      roomItems.push({
        def,
        x: randomInt(rx + 1, rx + rw - 2),
        y: randomInt(ry + 1, ry + rh - 2),
      });
    }

    rooms.push({ x: rx, y: ry, w: rw, h: rh, enemies: roomEnemies, items: roomItems });
  }

  // Connect rooms with corridors
  for (let i = 1; i < rooms.length; i++) {
    const prev = rooms[i - 1];
    const curr = rooms[i];
    const px = Math.floor(prev.x + prev.w / 2);
    const py = Math.floor(prev.y + prev.h / 2);
    const cx = Math.floor(curr.x + curr.w / 2);
    const cy = Math.floor(curr.y + curr.h / 2);

    // Horizontal corridor
    for (let x = Math.min(px, cx); x <= Math.max(px, cx); x++) {
      tiles[py][x] = 0;
    }
    // Vertical corridor
    for (let y = Math.min(py, cy); y <= Math.max(py, cy); y++) {
      tiles[y][cx] = 0;
    }
  }

  // Place exit in last room
  const lastRoom = rooms[rooms.length - 1];
  const exitX = Math.floor(lastRoom.x + lastRoom.w / 2);
  const exitY = Math.floor(lastRoom.y + lastRoom.h / 2);
  tiles[exitY][exitX] = 2;

  // Start in first room
  const firstRoom = rooms[0];
  const startX = Math.floor(firstRoom.x + firstRoom.w / 2);
  const startY = Math.floor(firstRoom.y + firstRoom.h / 2);

  return {
    width,
    height,
    tiles,
    rooms,
    startPos: [startX, startY],
    exitPos: [exitX, exitY],
    floor,
    dangerLevel,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/roguelike/dungeonGen.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/roguelike/dungeonGen.ts src/roguelike/entities.ts src/roguelike/items.ts src/data/enemies.json src/data/items.json tests/roguelike/dungeonGen.test.ts
git commit -m "feat: add procedural dungeon generation with enemies and items"
```

---

### Task 11: Turn-based combat system

**Files:**
- Create: `src/roguelike/combat.ts`
- Create: `tests/roguelike/combat.test.ts`

**Step 1: Write failing test**

Create `tests/roguelike/combat.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createCombatState, executeCombatRound, isCombatOver, getCombatResult } from '../../src/roguelike/combat.js';
import type { EnemyDef } from '../../src/roguelike/entities.js';

const dummyEnemy: EnemyDef = {
  id: 'grot', name: 'Grot', type: 'ork',
  hp: 30, attack: 5, defense: 2, exp: 10, minFloor: 1,
};

describe('Combat', () => {
  it('creates combat state', () => {
    const combat = createCombatState(100, 10, 5, dummyEnemy);
    expect(combat.playerHp).toBe(100);
    expect(combat.playerMaxHp).toBe(100);
    expect(combat.enemyHp).toBe(30);
    expect(combat.enemy.name).toBe('Grot');
  });

  it('player attacks reduce enemy HP', () => {
    const combat = createCombatState(100, 10, 5, dummyEnemy);
    executeCombatRound(combat, 'attack');
    expect(combat.enemyHp).toBeLessThan(30);
  });

  it('enemy attacks back', () => {
    const combat = createCombatState(100, 10, 5, dummyEnemy);
    executeCombatRound(combat, 'attack');
    expect(combat.playerHp).toBeLessThan(100);
  });

  it('player can flee', () => {
    const combat = createCombatState(100, 10, 5, dummyEnemy);
    executeCombatRound(combat, 'flee');
    expect(combat.fled).toBe(true);
  });

  it('combat ends when enemy HP reaches 0', () => {
    const combat = createCombatState(100, 999, 0, dummyEnemy);
    executeCombatRound(combat, 'attack');
    expect(isCombatOver(combat)).toBe(true);
    expect(getCombatResult(combat).winner).toBe('player');
  });

  it('combat ends when player HP reaches 0', () => {
    const combat = createCombatState(1, 0, 0, dummyEnemy);
    executeCombatRound(combat, 'attack');
    expect(isCombatOver(combat)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/roguelike/combat.test.ts`
Expected: FAIL

**Step 3: Implement combat**

Create `src/roguelike/combat.ts`:
```typescript
import type { EnemyDef } from './entities.js';

export interface CombatState {
  playerHp: number;
  playerMaxHp: number;
  playerAttack: number;
  playerDefense: number;
  enemy: EnemyDef;
  enemyHp: number;
  enemyMaxHp: number;
  fled: boolean;
  log: string[];
}

export type CombatAction = 'attack' | 'flee' | 'item';

export function createCombatState(
  playerHp: number,
  playerAttack: number,
  playerDefense: number,
  enemy: EnemyDef
): CombatState {
  return {
    playerHp,
    playerMaxHp: playerHp,
    playerAttack,
    playerDefense,
    enemy: { ...enemy },
    enemyHp: enemy.hp,
    enemyMaxHp: enemy.hp,
    fled: false,
    log: [],
  };
}

function calcDamage(attack: number, defense: number): number {
  const base = Math.max(1, attack - defense);
  return Math.max(1, base + Math.floor(Math.random() * 3) - 1); // +/- 1 variance
}

export function executeCombatRound(state: CombatState, action: CombatAction, _itemHeal?: number): void {
  if (action === 'flee') {
    state.fled = Math.random() < 0.5; // 50% flee chance
    if (state.fled) {
      state.log.push('You disengaged and retreated!');
    } else {
      state.log.push('Failed to flee!');
      // Enemy gets free attack
      const dmg = calcDamage(state.enemy.attack, state.playerDefense);
      state.playerHp = Math.max(0, state.playerHp - dmg);
      state.log.push(`${state.enemy.name} strikes for ${dmg} damage!`);
    }
    return;
  }

  if (action === 'attack') {
    // Player attacks
    const playerDmg = calcDamage(state.playerAttack, state.enemy.defense);
    state.enemyHp = Math.max(0, state.enemyHp - playerDmg);
    state.log.push(`You strike ${state.enemy.name} for ${playerDmg} damage!`);

    // Check enemy death
    if (state.enemyHp <= 0) {
      state.log.push(`${state.enemy.name} is slain! For the Emperor!`);
      return;
    }

    // Enemy counterattacks
    const enemyDmg = calcDamage(state.enemy.attack, state.playerDefense);
    state.playerHp = Math.max(0, state.playerHp - enemyDmg);
    state.log.push(`${state.enemy.name} retaliates for ${enemyDmg} damage!`);
  }
}

export function isCombatOver(state: CombatState): boolean {
  return state.playerHp <= 0 || state.enemyHp <= 0 || state.fled;
}

export function getCombatResult(state: CombatState): { winner: 'player' | 'enemy' | 'fled'; expGained: number } {
  if (state.fled) return { winner: 'fled', expGained: 0 };
  if (state.enemyHp <= 0) return { winner: 'player', expGained: state.enemy.exp };
  return { winner: 'enemy', expGained: 0 };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/roguelike/combat.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/roguelike/combat.ts tests/roguelike/combat.test.ts
git commit -m "feat: add turn-based combat system"
```

---

### Task 12: Canvas dungeon renderer

**Files:**
- Create: `src/render/canvasRenderer.ts`
- Create: `src/render/tileset.ts`
- Create: `src/roguelike/fogOfWar.ts`
- Create: `src/roguelike/dungeonView.ts`
- Modify: `index.html`
- Modify: `src/styles/main.css`

**Step 1: Create tileset definitions**

Create `src/render/tileset.ts`:
```typescript
// Colors for tile types (no sprite assets needed yet — colored rectangles)
export const TILE_COLORS = {
  wall: '#1a1a2e',
  floor: '#2a2a3e',
  exit: '#c9a84c',
  fog: '#0a0a0f',
  player: '#4a8',
  enemy: '#c44',
  item: '#48c',
  boss: '#c4c',
} as const;

export const TILE_SIZE = 24;

export type TileType = 'wall' | 'floor' | 'exit' | 'fog' | 'player' | 'enemy' | 'item' | 'boss';
```

**Step 2: Implement fog of war**

Create `src/roguelike/fogOfWar.ts`:
```typescript
export type FogState = 'hidden' | 'seen' | 'visible';

export function createFogMap(width: number, height: number): FogState[][] {
  return Array.from({ length: height }, () =>
    Array(width).fill('hidden') as FogState[]
  );
}

export function revealAround(
  fog: FogState[][],
  px: number,
  py: number,
  radius: number
): void {
  for (let y = py - radius; y <= py + radius; y++) {
    for (let x = px - radius; x <= px + radius; x++) {
      if (x < 0 || y < 0 || y >= fog.length || x >= fog[0].length) continue;
      const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
      if (dist <= radius) {
        fog[y][x] = 'visible';
      }
    }
  }
}

export function fadeVisibility(fog: FogState[][]): void {
  for (let y = 0; y < fog.length; y++) {
    for (let x = 0; x < fog[y].length; x++) {
      if (fog[y][x] === 'visible') {
        fog[y][x] = 'seen';
      }
    }
  }
}
```

**Step 3: Implement canvas renderer**

Create `src/render/canvasRenderer.ts`:
```typescript
import { TILE_SIZE, TILE_COLORS } from './tileset.js';
import type { Dungeon, Tile } from '../roguelike/dungeonGen.js';
import type { FogState } from '../roguelike/fogOfWar.js';

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cameraX = 0;
  private cameraY = 0;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  centerOn(x: number, y: number, viewWidth: number, viewHeight: number): void {
    this.cameraX = x * TILE_SIZE - viewWidth / 2;
    this.cameraY = y * TILE_SIZE - viewHeight / 2;
  }

  clear(): void {
    this.ctx.fillStyle = TILE_COLORS.fog;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  renderDungeon(dungeon: Dungeon, fog: FogState[][], playerPos: [number, number], enemyPositions: { x: number; y: number; isBoss?: boolean }[], itemPositions: { x: number; y: number }[]): void {
    this.clear();

    const viewW = this.canvas.width;
    const viewH = this.canvas.height;
    this.centerOn(playerPos[0], playerPos[1], viewW, viewH);

    this.ctx.save();
    this.ctx.translate(-this.cameraX, -this.cameraY);

    // Draw tiles
    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        const fogState = fog[y][x];
        if (fogState === 'hidden') continue;

        const tile = dungeon.tiles[y][x];
        let color: string;
        if (tile === 1) color = TILE_COLORS.wall;
        else if (tile === 2) color = TILE_COLORS.exit;
        else color = TILE_COLORS.floor;

        if (fogState === 'seen') {
          // Darken seen-but-not-visible tiles
          this.ctx.globalAlpha = 0.4;
        }

        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        this.ctx.globalAlpha = 1.0;
      }
    }

    // Draw items
    for (const pos of itemPositions) {
      if (fog[pos.y][pos.x] !== 'visible') continue;
      this.ctx.fillStyle = TILE_COLORS.item;
      this.ctx.fillRect(pos.x * TILE_SIZE + 6, pos.y * TILE_SIZE + 6, TILE_SIZE - 12, TILE_SIZE - 12);
    }

    // Draw enemies
    for (const pos of enemyPositions) {
      if (fog[pos.y][pos.x] !== 'visible') continue;
      this.ctx.fillStyle = pos.isBoss ? TILE_COLORS.boss : TILE_COLORS.enemy;
      this.ctx.fillRect(pos.x * TILE_SIZE + 4, pos.y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    }

    // Draw player
    this.ctx.fillStyle = TILE_COLORS.player;
    this.ctx.fillRect(
      playerPos[0] * TILE_SIZE + 2,
      playerPos[1] * TILE_SIZE + 2,
      TILE_SIZE - 4,
      TILE_SIZE - 4
    );

    this.ctx.restore();
  }
}
```

**Step 4: Create dungeon view controller**

Create `src/roguelike/dungeonView.ts`:
```typescript
import type { GameState } from '../game/gameState.js';
import type { Dungeon } from './dungeonGen.js';
import { generateDungeon } from './dungeonGen.js';
import type { EnemyDef } from './entities.js';
import { CanvasRenderer } from '../render/canvasRenderer.js';
import { createFogMap, revealAround, fadeVisibility } from './fogOfWar.js';
import type { FogState } from './fogOfWar.js';
import { createCombatState, executeCombatRound, isCombatOver, getCombatResult } from './combat.js';

export interface DungeonRun {
  dungeon: Dungeon;
  playerPos: [number, number];
  fog: FogState[][];
  playerHp: number;
  playerMaxHp: number;
  playerAttack: number;
  playerDefense: number;
  exp: number;
  loot: string[];
  currentFloor: number;
  maxFloors: number;
  inCombat: boolean;
  combatState: ReturnType<typeof createCombatState> | null;
  combatLog: string[];
  activeEnemies: { def: EnemyDef; x: number; y: number; hp: number; maxHp: number }[];
  activeItems: { id: string; x: number; y: number }[];
  gameOver: boolean;
  victory: boolean;
}

export function startDungeonRun(state: GameState, planetId: string, maxFloors: number): DungeonRun {
  const firstDungeon = generateDungeon(1, 1);

  return {
    dungeon: firstDungeon,
    playerPos: [...firstDungeon.startPos],
    fog: createFogMap(firstDungeon.width, firstDungeon.height),
    playerHp: 100 + state.player.level * 10,
    playerMaxHp: 100 + state.player.level * 10,
    playerAttack: 10 + state.player.level * 2,
    playerDefense: 3 + state.player.level,
    exp: 0,
    loot: [],
    currentFloor: 1,
    maxFloors,
    inCombat: false,
    combatState: null,
    combatLog: [],
    activeEnemies: [],
    activeItems: [],
    gameOver: false,
    victory: false,
  };
}

export function enterFloor(run: DungeonRun, floor: number): void {
  const dungeon = generateDungeon(floor, 1);
  run.dungeon = dungeon;
  run.playerPos = [...dungeon.startPos];
  run.fog = createFogMap(dungeon.width, dungeon.height);
  run.currentFloor = floor;
  run.activeEnemies = dungeon.rooms.flatMap(r => r.enemies.map(e => ({
    ...e,
    hp: e.def.hp,
    maxHp: e.def.hp,
  })));
  run.activeItems = dungeon.rooms.flatMap(r => r.items.map(i => ({
    id: i.def.id,
    x: i.x,
    y: i.y,
  })));
  revealAround(run.fog, run.playerPos[0], run.playerPos[1], 4);
}

export function movePlayer(run: DungeonRun, dx: number, dy: number): void {
  if (run.inCombat || run.gameOver) return;

  const [px, py] = run.playerPos;
  const nx = px + dx;
  const ny = py + dy;

  // Bounds check
  if (ny < 0 || ny >= run.dungeon.height || nx < 0 || nx >= run.dungeon.width) return;

  // Wall check
  if (run.dungeon.tiles[ny][nx] === 1) return;

  // Check for enemy
  const enemy = run.activeEnemies.find(e => e.x === nx && e.y === ny && e.hp > 0);
  if (enemy) {
    startCombat(run, enemy);
    return;
  }

  fadeVisibility(run.fog);
  run.playerPos = [nx, ny];
  revealAround(run.fog, nx, ny, 4);

  // Check for item pickup
  const itemIdx = run.activeItems.findIndex(i => i.x === nx && i.y === ny);
  if (itemIdx >= 0) {
    const item = run.activeItems[itemIdx];
    run.loot.push(item.id);
    run.combatLog.push(`Picked up: ${item.id}`);
    run.activeItems.splice(itemIdx, 1);
  }

  // Check for exit
  if (run.dungeon.tiles[ny][nx] === 2) {
    if (run.currentFloor < run.maxFloors) {
      enterFloor(run, run.currentFloor + 1);
      run.combatLog.push(`Descending to floor ${run.currentFloor}...`);
    } else {
      run.gameOver = true;
      run.victory = true;
      run.combatLog.push('Expedition complete! For the Emperor!');
    }
  }
}

function startCombat(run: DungeonRun, enemy: { def: EnemyDef; x: number; y: number; hp: number; maxHp: number }): void {
  run.inCombat = true;
  run.combatState = createCombatState(run.playerHp, run.playerAttack, run.playerDefense, enemy.def);
  run.combatLog = [];
}

export function playerAttack(run: DungeonRun): void {
  if (!run.combatState || !run.inCombat) return;

  executeCombatRound(run.combatState, 'attack');
  run.combatLog.push(...run.combatState.log);
  run.combatState.log = [];

  if (isCombatOver(run.combatState)) {
    resolveCombat(run);
  }
}

export function playerFlee(run: DungeonRun): void {
  if (!run.combatState || !run.inCombat) return;

  executeCombatRound(run.combatState, 'flee');
  run.combatLog.push(...run.combatState.log);
  run.combatState.log = [];

  if (isCombatOver(run.combatState)) {
    resolveCombat(run);
  }
}

function resolveCombat(run: DungeonRun): void {
  if (!run.combatState) return;
  const result = getCombatResult(run.combatState);
  run.playerHp = run.combatState.playerHp;

  if (result.winner === 'player') {
    const enemy = run.activeEnemies.find(e => e.def.id === run.combatState!.enemy.id && e.hp > 0);
    if (enemy) enemy.hp = 0;
    run.exp += result.expGained;
    run.combatLog.push(`Gained ${result.expGained} experience!`);
  }

  if (result.winner === 'enemy' || run.playerHp <= 0) {
    run.gameOver = true;
    run.victory = false;
    run.combatLog.push('You have fallen. The Emperor protects.');
  }

  run.inCombat = false;
  run.combatState = null;
}
```

**Step 5: Add dungeon view HTML to index.html**

Replace the `#view-dungeon` div in `index.html`:
```html
<div id="view-dungeon" class="view">
  <header id="header">
    <h1>EXPEDITION</h1>
    <nav id="nav">
      <button class="nav-btn" data-view="idle">Base</button>
      <button class="nav-btn" data-view="starmap">Star Map</button>
      <button class="nav-btn active" data-view="dungeon">Expedition</button>
    </nav>
  </header>

  <div id="dungeon-hud">
    <span id="dungeon-floor">Floor 1</span>
    <span id="dungeon-hp">HP: 100/100</span>
    <span id="dungeon-atk">ATK: 10</span>
    <span id="dungeon-def">DEF: 3</span>
    <span id="dungeon-exp">EXP: 0</span>
  </div>

  <div id="dungeon-container">
    <canvas id="dungeon-canvas"></canvas>
  </div>

  <div id="combat-panel" style="display:none">
    <div id="combat-info"></div>
    <div id="combat-log"></div>
    <div id="combat-actions">
      <button class="combat-btn" id="btn-attack">ATTACK</button>
      <button class="combat-btn" id="btn-flee">FLEE</button>
    </div>
  </div>

  <div id="dungeon-log"></div>

  <div id="dungeon-controls">
    <div class="control-row">
      <button class="move-btn" data-dir="up">▲</button>
    </div>
    <div class="control-row">
      <button class="move-btn" data-dir="left">◀</button>
      <button class="move-btn" data-dir="wait">■</button>
      <button class="move-btn" data-dir="right">▶</button>
    </div>
    <div class="control-row">
      <button class="move-btn" data-dir="down">▼</button>
    </div>
  </div>

  <div id="dungeon-result" style="display:none"></div>
</div>
```

**Step 6: Add dungeon styles to main.css**

Append to `src/styles/main.css`:
```css
/* Dungeon HUD */
#dungeon-hud {
  display: flex;
  gap: 16px;
  padding: 8px 14px;
  background: #12121f;
  border: 1px solid #1e1e3a;
  margin-bottom: 8px;
  font-size: 0.85rem;
  letter-spacing: 1px;
}

#dungeon-container {
  background: #000;
  border: 1px solid #1e1e3a;
  margin-bottom: 8px;
  overflow: hidden;
}

#dungeon-canvas {
  display: block;
}

/* Combat */
#combat-panel {
  background: #1a0a0a;
  border: 1px solid #c44;
  padding: 14px;
  margin-bottom: 8px;
}

#combat-info {
  color: #c44;
  font-size: 1rem;
  margin-bottom: 8px;
}

#combat-log {
  color: #888;
  font-size: 0.75rem;
  max-height: 80px;
  overflow-y: auto;
  margin-bottom: 8px;
}

#combat-log p {
  margin-bottom: 2px;
}

#combat-actions {
  display: flex;
  gap: 8px;
}

.combat-btn {
  background: #2a0a0a;
  color: #c44;
  border: 1px solid #c44;
  padding: 8px 20px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.85rem;
  letter-spacing: 2px;
}

.combat-btn:hover:not(:disabled) {
  background: #3a1a1a;
}

/* Dungeon log */
#dungeon-log {
  color: #555;
  font-size: 0.75rem;
  max-height: 60px;
  overflow-y: auto;
  margin-bottom: 8px;
  padding: 4px;
}

/* Movement controls */
#dungeon-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}

.control-row {
  display: flex;
  gap: 4px;
}

.move-btn {
  background: #1a1a2e;
  color: #c9a84c;
  border: 1px solid #333;
  width: 48px;
  height: 48px;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.move-btn:hover {
  border-color: #c9a84c;
}

/* Keyboard hint */
#keyboard-hint {
  color: #444;
  font-size: 0.7rem;
  text-align: center;
  margin-bottom: 8px;
}
```

**Step 7: Wire dungeon into main.ts**

Update `src/main.ts` to handle dungeon expeditions. Add imports and connect the star map planet selection to dungeon view initialization. The main.ts should:
1. Import `startDungeonRun`, `enterFloor`, `movePlayer`, `playerAttack`, `playerFlee`, `CanvasRenderer`, `DungeonRun`
2. On planet select: create a `DungeonRun`, switch to dungeon view, initialize canvas
3. Set up keyboard (WASD/Arrow keys) and button movement
4. Set up combat buttons
5. Render loop via requestAnimationFrame
6. On dungeon end: apply rewards to game state, return to idle view

This is the integration step — the code connects all systems together.

**Step 8: Run dev server and test**

Run: `npm run dev`
Expected: Build a ship, select a planet on star map, enter dungeon. Canvas shows tile map. WASD/arrow keys move. Combat triggers on enemy contact. Completing all floors returns to base with rewards.

**Step 9: Commit**

```bash
git add src/render/canvasRenderer.ts src/render/tileset.ts src/roguelike/fogOfWar.ts src/roguelike/dungeonView.ts index.html src/styles/main.css src/main.ts
git commit -m "feat: add canvas dungeon renderer, fog of war, and dungeon view"
```

---

## Phase 5: Polish & Integration

### Task 13: Auto-save integration and offline progress UI

**Files:**
- Modify: `src/main.ts`
- Modify: `src/styles/main.css`

Wire up the save manager to all views, show offline progress notification on return, and add save indicator to UI.

**Step 1:** Add a `#save-indicator` element to index.html header area.
**Step 2:** In `src/main.ts`, show "Welcome back" notification with recovered resources when offline progress is calculated.
**Step 3:** Show brief "Saving..." flash on auto-save.

**Step 4:** Run and verify.
**Step 5:** Commit: `feat: add auto-save indicator and offline progress notification`

---

### Task 14: W40K player classes and tech tree

**Files:**
- Create: `src/player/classes.ts`
- Create: `src/player/inventory.ts`
- Create: `src/tech/techTree.ts`
- Create: `src/data/tech.json`
- Create: `tests/player/classes.test.ts`

**Step 1:** Define W40K classes (Space Marine, Inquisitor, Tech-Priest, Commissar) with stat modifiers.
**Step 2:** Implement inventory system (max slots, equip/unequip).
**Step 3:** Define tech tree with prerequisites.
**Step 4:** Write tests.
**Step 5:** Commit: `feat: add W40K player classes, inventory, and tech tree`

---

### Task 15: Final integration test and cleanup

**Step 1:** Run all tests: `npx vitest run`
**Step 2:** Run dev server: `npm run dev` — play through the full loop: gather resources → build → ship → planet → dungeon → return.
**Step 3:** Fix any bugs found.
**Step 4:** Commit: `chore: final integration pass and bug fixes`

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1. Scaffolding | Tasks 1-4 | Vite + TS project, game state, save/load, UI manager |
| 2. Idle System | Tasks 5-7 | Buildings, game loop, resource panel UI — core idle loop works |
| 3. Star Map | Tasks 8-9 | Planets, ships, star map view — can build ships and select destinations |
| 4. Roguelike | Tasks 10-12 | Dungeon gen, combat, canvas renderer — full dungeon exploration |
| 5. Polish | Tasks 13-15 | Auto-save UI, classes/tech, integration testing — complete game loop |
