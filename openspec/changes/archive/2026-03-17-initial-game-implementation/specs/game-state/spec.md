# game-state

Global state management for Deep Sky. Tracks all persistent player data. Pure TypeScript — no DOM dependencies.

## Requirements

- **Resource tracking**: Track 5 resource types (minerals, energy, tech, alloys, relics) with add/spend operations
- **Resource safety**: Spending must fail atomically — if insufficient funds, no resources are deducted
- **Bulk operations**: `canAfford(cost)` checks multiple resources at once; `spendResources(cost)` deducts multiple atomically
- **Building state**: Track unlocked buildings with level (1-10) per building ID
- **Player state**: Track class, level, experience, and equipped items
- **Progression**: Track explored planets, unlocked tech, constructed ships, and statistics (play time, deepest dungeon, relics found)
- **Serialization**: `toSaveData()` produces a plain object; `fromSaveData()` restores from it. Both create deep copies to prevent mutation bugs
- **Timestamp**: Record `lastTickTime` for offline progress calculation
- **Save version**: All saves tagged with version string for future migration
