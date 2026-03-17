# Implementation Tasks

## Phase 1: Project Scaffolding

- [x] Set up Vite + TypeScript project with ESM modules, vitest, idb-keyval
- [x] Create game state store with resource management, serialization, and building state
- [x] Create IndexedDB save/load system via idb-keyval
- [x] Create UI view manager with view switching and component helpers

## Phase 2: Idle System

- [x] Define 4 buildings with JSON config (Mining Shaft, Plasma Generator, Divination Chamber, Alloy Forge)
- [x] Implement building upgrade logic with exponential cost scaling
- [x] Implement game loop with per-second tick and offline progress calculation
- [x] Build idle view UI with resource panel and building cards

## Phase 3: Star Map

- [x] Define 5 W40K planets and 3 ships with JSON config
- [x] Implement planet unlock and ship construction logic
- [x] Build star map view with shipyard panel and planet list

## Phase 4: Roguelike Dungeon

- [x] Implement procedural dungeon generation (room-based, corridors, floor scaling)
- [x] Define 7 enemies and 6 items with JSON config
- [x] Implement turn-based combat system (attack, flee, damage, resolution)
- [x] Implement Canvas 2D renderer with camera centering and fog of war
- [x] Build dungeon view with movement controls, combat UI, and floor progression
- [x] Wire dungeon expedition into main.ts (star map planet select → dungeon → rewards → return)

## Phase 5: Polish

- [x] Add auto-save indicator with flash animation
- [x] Add W40K player classes (Space Marine, Inquisitor, Tech-Priest, Commissar)
- [x] Add inventory system (20-slot limit)
- [x] Add tech tree with 5 nodes and prerequisite logic
- [x] Fix TypeScript type errors in JSON data imports
- [x] Final integration verification: 46 tests passing, zero type errors, build succeeds

## Test Coverage

- 9 test files, 46 tests total, all passing
- gameState: 8 tests (init, resources, spend, serialize/deserialize)
- saveManager: 3 tests (save, load, missing data)
- uiManager: 3 tests (view switching, events, same-view no-op)
- buildings: 6 tests (definitions, cost scaling, production, upgrade)
- gameLoop: 7 tests (tick, multi-building, refinery, offline, cap)
- planets: 4 tests (definitions, unlock logic, ship requirements)
- dungeonGen: 5 tests (rooms, start/exit, dimensions, floor scaling)
- combat: 6 tests (init, attack, counterattack, flee, death)
- classes: 4 tests (list, fields, lookup, unknown)
