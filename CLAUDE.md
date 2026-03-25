# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Deep Sky** is a Warhammer 40K-themed idle/roguelike browser game built with pure TypeScript, HTML/CSS, and Canvas 2D. No frameworks or game engines.

## Commands

```bash
npm run dev      # Start Vite dev server
npm run build    # TypeScript check + Vite production build
npm run preview # Preview production build
npm run test     # Run all tests (Vitest)
npm run test:watch # Watch mode for tests
```

Run a single test file:
```bash
npx vitest run tests/game/gameState.test.ts
```

## Architecture

### Core Pattern
- **GameState class** (`src/game/gameState.ts`) — Central state container with resources, buildings, player, and persistence helpers
- **EventBus** (`src/game/eventBus.ts`) — Simple pub/sub for loose coupling
- **GameLoop** (`src/game/gameLoop.ts`) — Idle resource tick system with offline progress calculation
- **SaveManager** (`src/game/saveManager.ts`) — IndexedDB persistence via idb-keyval

### Views (show/hide with `.active` CSS class)
1. **Idle View** (`src/idle/idleView.ts`) — Base building management, resource generation
2. **Star Map** (`src/starmap/starMapView.ts`) — Planet exploration, ship management
3. **Dungeon View** (`src/roguelike/dungeonView.ts`) — Roguelike expedition with Canvas 2D rendering

### Module Responsibilities
- `src/player/` — Player classes and inventory
- `src/tech/` — Tech tree system
- `src/render/` — Canvas 2D tile rendering (dungeon maps, fog of war)
- `src/roguelike/` — Dungeon generation, combat, entities, items
- `src/ui/` — DOM-based UI panel management

### Rendering Strategy
- **HTML/CSS** for all UI panels and HUD elements
- **Canvas 2D** (`src/render/canvasRenderer.ts`) ONLY for roguelike tile maps
- Tileset-based rendering with procedural ASCII-style tiles

### State Shape (SaveData)
```typescript
interface SaveData {
  version: string;
  resources: { minerals, energy, tech, alloys, relics };
  buildings: Record<string, { level, unlocked }>;
  player: { class, level, exp, equipment };
  exploredPlanets: string[];
  techUnlocked: string[];
  shipsBuilt: string[];
  statistics: { totalPlayTime, deepestDungeon, relicsFound };
}
```

## OpenSpec Workflow

This project uses [OpenSpec](https://github.com/ardydedeh/openspec) for tracking specs and changes. Use the `Skill` tool with `openspec-*` skills to work with this workflow.

Key paths:
- `openspec/config.yaml` — Project context and rules
- `openspec/specs/` — Current feature specs
- `openspec/changes/` — Change proposals and archives

## TypeScript Config

- Path alias: `@/*` maps to `src/*`
- Strict mode enabled
- `noEmit: true` (Vite handles bundling)
- `moduleResolution: bundler`

## Game Balance

- Auto-save every 30 seconds + on view switch + on `beforeunload`
- Offline progress capped and calculated on load (only if >5 seconds elapsed)
- 5 resource types: minerals, energy, tech, alloys, relics

## Design Context

### Users
硬核 Warhammer 40K 粉丝，年龄 18-45，熟悉战锤宇宙的视觉语言和 IP。玩放置类 + roguelike 游戏，追求策略深度、收集系统和视觉沉浸感。需要在浏览器中获得太空探索的视觉体验。只能看懂中文。

### Brand Personality
**Destiny-style Cosmic Grandeur** — 星图的壮丽与科技的精密并存。界面应有宇宙的深邃感与未来的希望感，每处细节都像是在展示星际文明的科技成果。文字风格保留《战锤40K》的宏大叙事语气。

**3-word personality**: Cosmic, Luminous, Precise

### Aesthetic Direction
**Reference**: Destiny 星图美学 + 现代科幻 UI + 银白太空感 + 全息光效

- 银白色基底配合冰蓝色线条和光晕，暗示宇宙的广袤与科技的高度发达
- 加入微妙的光效（渐变光晕、柔和发光边缘、全息感边框）
- 使用科幻感字体做标题、现代易读字体做正文，字号整体偏大
- 蓝紫色作为主要科技色，金色保留为强调色（帝国的传承）
- 暗红色继续用于危险/战斗场景
- 整体感觉：星际指挥中心 + 全息星图 + 未来军事指挥台

**Anti-references**: 不要赛博朋克霓虹、纯黑黑暗主题、工业切割角、铆钉边框、衬线古典字体、圆润卡通

### Design Principles

1. **宇宙光辉 (Cosmic Luminance)**: UI 应有星际的光感和深度——银白底色、冰蓝光晕、柔和渐变，营造出在太空中观察的感觉
2. **银白科技 (Silver-White Futurism)**: 银白/浅蓝为主基调，金色为点缀，远离纯黑暗色主题，保持现代感和未来感
3. **全息精密 (Holographic Precision)**: 用发光边框、半透明面板、渐变光效替代工业切割角，暗示全息科技界面
4. **清晰可读 (Clear Readability)**: 字号整体放大，信息层级通过色温和亮度区分而非尺寸对比——资源、状态、操作一目了然
5. **战锤宇宙沉浸**: 文案和世界观叙事保持 W40K 风格，视觉风格从"帝国档案馆"转向"星际指挥中心"

### Typography
- **标题字体**: 科幻感无衬线字体（如 Rajdhani, Exo 2, Orbitron），强调科技感
- **正文字体**: 现代无衬线字体（如 Inter, Noto Sans SC），确保中文可读性
- **字号整体偏大**: 基础字号至少 14px，最小字号不低于 12px，标题层级清晰

### Color Direction
- **背景**: 银白色底色带冷蓝调（非纯黑、非深蓝），面板用半透明银蓝玻璃感，整体偏亮
- **文字**: 白色/银白色为主，冷蓝色为辅助
- **强调**: 金色（帝国传承）、蓝色（科技/能量）、红色（危险/战斗）
- **光效**: 柔和的蓝白光晕、渐变边缘、半透明叠加
- **Surface**: 从 surface-1 (bg) 到 surface-5 逐级提亮的银灰色系，OKLCH 色度低 (< 0.03) 保持银白质感

### Accessibility
- 无特殊无障碍要求；`prefers-reduced-motion` 媒体查询已实现（所有动画/过渡在系统设置中自动禁用）
- 色彩使用蓝/白/金/红四色系统，绿色仅用于成功提示
- 项目语言：全中文（仅支持中文用户）
