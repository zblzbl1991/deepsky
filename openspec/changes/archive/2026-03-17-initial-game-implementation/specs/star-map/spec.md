# star-map

Interstellar navigation — build ships and travel to W40K-themed planets.

## Requirements

- **5 planets**: Aridia Prime (Dead World), Tartarus Hive (Hive World), Carnage IV (Death World), The Screaming Rift (Chaos Space), Mars Secundus (Forge World)
- **Planet attributes**: Each planet has name, type, danger level (1-4), distance, energy cost, rewards, required ship, and dungeon floors
- **Planet unlock**: First planet always unlocked; others require building the corresponding ship
- **3 ships**: Imperial Frigate (range 2), Lunar Cruiser (range 3), Strike Cruiser (range 5)
- **Ship construction**: Ships are built once (tracked in `shipsBuilt` array), require resources, and persist across sessions
- **Ship cost**: Each ship has a resource cost checked via `canAfford()`
- **Expedition launch**: Selecting a planet deducts energy cost and transitions to dungeon view
- **Danger level display**: Visual bar using ▓/░ characters showing 1-5 difficulty
