# Deep Sky — Design Document

> A Warhammer 40K themed idle/roguelike space exploration game built with pure TypeScript.

## Overview

Deep Sky is a single-player browser game combining idle/incremental mechanics with roguelike dungeon exploration, set in the Warhammer 40K universe. Players manage an Imperial outpost, gather resources through idle mechanics, build ships, travel to planets, and explore procedurally generated dungeons in a turn-based roguelike format.

## Technology Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| Language | TypeScript 5+ | Zero framework, zero game engine |
| Rendering | HTML Canvas 2D API | Only for roguelike tile maps |
| UI | HTML + CSS | Resource panels, menus, buttons |
| Build | Vite | Native TS support, fast HMR |
| Persistence | IndexedDB via `idb-keyval` | Single-player, no server needed |
| Dependencies | Minimal | No frameworks, no game engines |

## Architecture

```
┌──────────────────────────────────────┐
│         HTML/CSS UI Layer            │
│  Resources · Build · Starmap ·       │
│  Inventory · Settings                │
├──────────────────────────────────────┤
│      Game State (gameState.ts)       │
│  Resources · Progress · Save ·       │
│  Settings · Event Bus                │
├──────────────────────────────────────┤
│      Canvas 2D Renderer              │
│  Roguelike map · Character sprites   │
│  Animations · Fog of war             │
├──────────────────────────────────────┤
│      Game Logic (pure TS, no DOM)    │
│  Idle engine · Dungeon gen · Combat  │
│  Exploration · Items                 │
├──────────────────────────────────────┤
│      Data Persistence                │
│  IndexedDB · Auto-save · Slots       │
└──────────────────────────────────────┘
```

Key principle: Game logic layer is pure TypeScript with no DOM or Canvas dependencies. Easy to test, easy to port.

### View System

No router framework. Simple view switching: `showView('idle')` / `showView('starmap')` / `showView('dungeon')`, toggling visibility of corresponding HTML sections.

## Core Gameplay Systems

### 1. Idle System (Base View)

**Resources:**

| Resource | Purpose | Source |
|----------|---------|--------|
| Minerals | Build ships, upgrade buildings | Mines (auto + click) |
| Energy | Power facilities, ship fuel | Power plants (auto) |
| Tech Points | Unlock tech tree | Research stations, dungeon rewards |
| Alloys | Advanced construction | Refined from minerals + energy |
| Xenos Relics | W40K special abilities | Dungeon boss drops |

**Buildings:** Mine, Power Plant, Research Lab, Refinery, Shipyard. Each upgradeable 1-10, increasing output.

**Offline Progress:** Record close time, calculate elapsed production on reopen (capped to prevent abuse).

### 2. Star Map System

Displays explorable planets from the player's base. Each planet has: name, danger level, resource types, unlock requirements. Travel requires a built ship of sufficient level + energy cost.

**Planet Types (W40K themed):**
- Dead World — barren, mineral-rich
- Hive World — dense population, tech rewards
- Death World — dangerous flora/fauna, rare relics
- Chaos Space — corrupted, high risk/reward
- Forge World — STC fragments, alloy resources
- Space Hulk — derelict vessel, best relic drops

### 3. Roguelike Exploration

**Dungeon Generation:** Room-template-based procedural generation. Each room has terrain type, enemies, events, and items. Deeper floors = harder.

**Turn-Based Combat:**
- Each movement/action is one turn
- Encounter enemies to enter combat mode
- W40K classes: Space Marine, Inquisitor, Tech-Priest, Commissar
- Weapons: Chainsword, Bolter, Plasma Gun, Power Fist, Melta Gun

**Permadeath (partial):** Death in a dungeon loses collected loot from that run. Base experience and unlocked tech are preserved.

### 4. Progression Loop

```
Idle gather resources → Build/upgrade → Build ship →
Select planet → Roguelike explore → Get relics/tech →
Unlock new tech/buildings → Boost production →
Explore farther planets → ...
```

## W40K Theme Integration

| Game Mechanic | W40K Flavor |
|--------------|-------------|
| Base | Imperial Outpost / Tech-Priest Forge World |
| Mines | Mining Shafts — dig deep into the crust |
| Research Lab | Tech-Priest Divination Chamber — parse STC fragments |
| Ships | Imperial Transport / Stormraven |
| Dungeons | Abandoned Hive City / Space Hulk / Chaos Under-Temple |
| Enemies | Orks, Tyranids, Chaos Daemons, Dark Eldar |
| Bosses | Warboss, Hive Tyrant, Great Unclean One, Archon |
| Relics | Imperial Relics, Ancient STC Fragments, Xenos Technology |
| Tech Tree | Adeptus Mechanicus Dogma, Imperial Military Doctrine, Xenos Reverse-Engineering |

Text style uses W40K Gothic grand narrative tone for UI copy and event descriptions.

## Project Structure

```
deepSky/
├── index.html
├── src/
│   ├── main.ts                # Entry point, game initialization
│   ├── game/
│   │   ├── gameState.ts       # Global game state
│   │   ├── saveManager.ts     # IndexedDB save/load
│   │   ├── eventBus.ts        # Pub/sub event system
│   │   └── gameLoop.ts        # Main loop (idle tick calculation)
│   ├── idle/
│   │   ├── idleView.ts        # Idle base view rendering
│   │   ├── buildings.ts       # Building definitions & upgrade logic
│   │   └── resources.ts       # Resource definitions & production
│   ├── starmap/
│   │   ├── starMapView.ts     # Star map interface
│   │   ├── planets.ts         # Planet definitions & unlock conditions
│   │   └── ships.ts           # Ship definitions & build logic
│   ├── roguelike/
│   │   ├── dungeonView.ts     # Canvas dungeon renderer
│   │   ├── dungeonGen.ts      # Procedural dungeon generation
│   │   ├── combat.ts          # Turn-based combat logic
│   │   ├── entities.ts        # Enemy/NPC definitions
│   │   ├── items.ts           # Item/weapon system
│   │   └── fogOfWar.ts        # Fog of war system
│   ├── player/
│   │   ├── player.ts          # Player attributes & class
│   │   ├── classes.ts         # W40K class definitions
│   │   └── inventory.ts       # Backpack management
│   ├── tech/
│   │   └── techTree.ts        # Tech tree definition & unlock
│   ├── ui/
│   │   ├── uiManager.ts       # View switching management
│   │   └── components.ts      # Shared UI components
│   ├── data/
│   │   ├── buildings.json     # Building config
│   │   ├── planets.json       # Planet config
│   │   ├── enemies.json       # Enemy config
│   │   └── items.json         # Item config
│   ├── render/
│   │   ├── canvasRenderer.ts  # Canvas 2D renderer wrapper
│   │   ├── spriteSheet.ts     # Pixel sprite sheet management
│   │   └── tileset.ts         # Tile image definitions
│   └── utils/
│       ├── math.ts            # Math utilities
│       └── constants.ts       # Global constants
├── assets/
│   ├── tiles/                 # Tile pixel art
│   ├── sprites/               # Character/monster pixel art
│   └── ui/                    # UI icon pixel art
├── docs/
│   └── plans/                 # Design documents
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Save System

```typescript
interface SaveData {
  version: string;
  timestamp: number;
  resources: {
    minerals: number;
    energy: number;
    tech: number;
    alloys: number;
    relics: number;
  };
  buildings: Record<string, { level: number; unlocked: boolean }>;
  player: {
    class: string;
    level: number;
    exp: number;
    equipment: string[];
  };
  exploredPlanets: string[];
  techUnlocked: string[];
  shipsBuilt: string[];
  statistics: {
    totalPlayTime: number;
    deepestDungeon: number;
    relicsFound: number;
  };
}
```

Auto-save triggers: every 30 seconds, on view switch, on page close.
