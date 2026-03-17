# roguelike-dungeon

Procedural dungeon generation for turn-based exploration.

## Requirements

- **Map generation**: Grid-based tile maps with Tile 0 (floor), 1 (wall), 2 (exit)
- **Room placement**: Rooms placed via rejection sampling — random size (5-10 x 4-8 tiles), no overlap with 1-tile padding
- **Room count**: Scales with floor depth: `5 + floor * 2` rooms per floor
- **Map size**: Scales with floor: `(40 + floor*5)` x `(30 + floor*3)` tiles
- **Corridor connections**: L-shaped corridors (horizontal then vertical) connecting room centers
- **Start/Exit**: Start position in first room center, exit tile in last room center
- **Enemy placement**: Enemies placed in rooms (skip first room), count based on floor difficulty
- **Item placement**: 30% chance per room to contain an item
- **Enemy scaling**: Enemies filtered by `minFloor` — deeper floors unlock harder enemies
- **Floor progression**: Reaching exit tile advances to next floor (up to `maxFloors`)
- **7 enemies**: Grots, Ork Boys, Termagants, Genestealers, Daemonettes, Warboss (boss), Hive Tyrant (boss)
- **6 items**: Chainsword, Boltpistol, Plasma Gun, Power Armour Fragment, Medicae Kit, STC Fragment
