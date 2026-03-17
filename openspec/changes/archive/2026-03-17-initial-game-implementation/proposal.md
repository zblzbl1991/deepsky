## Why

Build a playable W40K themed idle/roguelike browser game from scratch. The game combines idle resource gathering with roguelike dungeon exploration in a single-player web experience, requiring no server infrastructure.

## What Changes

- New project scaffolding: Vite + TypeScript with zero game frameworks
- New game state management system with IndexedDB persistence and offline progress
- New idle/incremental system: 4 buildings (Mining Shaft, Plasma Generator, Divination Chamber, Alloy Forge) with upgrade scaling
- New star map system: 5 W40K-themed planets and 3 ships with unlock progression
- New roguelike dungeon system: procedural room-based generation, turn-based combat, fog of war, floor progression
- New Canvas 2D renderer for dungeon tile maps
- New W40K player classes (Space Marine, Inquisitor, Tech-Priest, Commissar), inventory system, and 5-node tech tree

## Capabilities

### New Capabilities
- `game-state`: Global state management — resources, buildings, player stats, save/load serialization. Pure TS with no DOM dependencies.
- `idle-system`: Resource production loop with building definitions, upgrade costs, per-second tick calculation, offline progress recovery.
- `star-map`: Interstellar navigation — ship construction, planet unlock conditions, expedition launching.
- `roguelike-dungeon`: Procedural dungeon generation, room-based maps, enemy/item placement, corridor connections, floor progression.
- `turn-based-combat`: Attack/flee mechanics, damage calculation (attack - defense +/- variance), EXP rewards, death handling.
- `canvas-renderer`: 2D tile map rendering with camera centering, fog-of-war alpha dimming, entity drawing (player/enemies/items).
- `player-classes`: W40K class definitions (Space Marine, Inquisitor, Tech-Priest, Commissar) with stat modifiers.
- `inventory`: Item management with 20-slot limit.
- `tech-tree`: 5-node dependency graph with prerequisite-based unlock logic.

### Modified Capabilities
(No existing capabilities — this is the initial implementation.)

## Impact

- Build toolchain: Vite + TypeScript + Vitest
- Runtime dependencies: idb-keyval (IndexedDB wrapper)
- No server or backend required — fully client-side
- Package size: ~24 KB gzipped
