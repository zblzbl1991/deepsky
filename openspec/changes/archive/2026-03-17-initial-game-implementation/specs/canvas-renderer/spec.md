# canvas-renderer

2D tile map rendering using the HTML Canvas API.

## Requirements

- **Tile rendering**: Draw floor tiles, wall tiles, and exit tiles with distinct colors
- **Camera system**: Canvas is always centered on the player position
- **Entity rendering**: Draw player (green), enemies (red), bosses (purple), items (blue) as colored rectangles within tiles
- **Fog of war**: Hidden tiles not rendered; seen tiles rendered at 40% opacity; visible tiles at full opacity
- **Dead entity filtering**: Enemies with HP <= 0 are not rendered
- **Fog-aware rendering**: Entities only rendered if their tile is in 'visible' fog state
- **Tile size**: 24x24 pixels per tile
- **Color palette**: Wall (#1a1a2e), Floor (#2a2a3e), Exit (#c9a84c), Player (#4a8), Enemy (#c44), Item (#48c), Boss (#c4c), Fog (#0a0a0f)
- **Resize support**: Canvas width/height can be set dynamically
