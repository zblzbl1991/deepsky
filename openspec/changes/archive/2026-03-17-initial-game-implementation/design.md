## Context

Deep Sky is a new project — a single-player W40K themed idle/roguelike browser game. No prior codebase exists. The game must run entirely client-side with no server, targeting modern browsers via Vite + TypeScript.

The core gameplay loop is: idle resource gathering → build facilities → construct ships → select planets → roguelike dungeon exploration → collect loot → upgrade and repeat.

## Goals / Non-Goals

**Goals:**
- Implement the full core gameplay loop from resource gathering to dungeon completion
- Keep the tech stack minimal — pure TypeScript, no frameworks or game engines
- Maintain separation between game logic (pure TS, testable) and presentation (DOM/Canvas)
- Support offline progress recovery and auto-save
- Create a dark, W40K Gothic aesthetic with gold text and pixel-art-inspired visuals

**Non-Goals:**
- Multiplayer or server-side features
- Mobile-native deployment (web-only for now)
- Complex audio/sound system
- Sprite animation system (colored rectangles are sufficient for MVP)
- Detailed tech tree UI wiring (data model only for now)

## Decisions

**D1: Pure TypeScript over game framework (Phaser/React/PixiJS)**
- Chose zero-dependency approach to minimize bundle size (~24 KB gzipped)
- Canvas 2D API is sufficient for a tile-based roguelike map
- HTML/CSS is more productive for UI panels (resource bars, building cards) than canvas rendering
- Alternative considered: Phaser 3 (rejected — too heavy for what we need)

**D2: Layered architecture with pure TS logic layer**
- Game logic (idle tick, combat, dungeon gen) has zero DOM dependencies
- Enables unit testing without browser environment (only UI tests need jsdom)
- Makes future porting (e.g., to a native app) straightforward
- Alternative considered: Mixing logic with React hooks (rejected — tighter coupling)

**D3: Simple view switching over SPA router**
- Only 3 views (idle/starmap/dungeon) — overkill to add a router
- CSS `.active` class toggle is sufficient
- Alternative considered: Hash-based routing (rejected — unnecessary complexity)

**D4: IndexedDB via idb-keyval for persistence**
- Browser-native, no server needed
- idb-keyval provides a clean key-value API over IndexedDB
- Auto-save every 30s + on view switch + on page close
- Offline progress capped at 8 hours to prevent abuse
- Alternative considered: localStorage (rejected — size limits too restrictive)

**D5: Room-template dungeon generation**
- Rooms placed via rejection sampling (no overlap), connected by L-shaped corridors
- Map size scales with floor depth (40+5*floor x 30+3*floor)
- Enemies and items placed per-room based on floor difficulty
- Alternative considered: BSP tree generation (rejected — rooms feel more natural)

**D6: Simple damage formula for combat**
- `damage = max(1, attack - defense) + random(-1, 0, +1)`
- Flee has 50% success rate, failure = free enemy hit
- Keeps combat predictable but with slight variance
- Alternative considered: Crit system (deferred — unnecessary for MVP)

## Risks / Trade-offs

- [No sprite art] → Colored rectangles on canvas are functional but visually minimal. Trade-off: faster development vs. visual polish. Mitigation: Pixel art can be added later by swapping tileset colors for sprite images.
- [No build tooling for assets] → No asset pipeline. Trade-off: simpler but limits future art additions. Mitigation: Add a sprite loader when needed.
- [Single-file main.ts growing large] → All wiring in one file. Trade-off: convenient for now but may need splitting. Mitigation: Refactor when main.ts exceeds ~200 lines.
- [No input buffering] → Keyboard events are immediate, no queue. Trade-off: simpler but doesn't handle rapid key presses well. Mitigation: Sufficient for turn-based gameplay.
