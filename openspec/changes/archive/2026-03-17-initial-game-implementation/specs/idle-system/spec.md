# idle-system

Resource production loop that runs continuously in the background.

## Requirements

- **Building production**: Each unlocked building produces resources per second based on `baseProduction * level`
- **Building consumption**: Refinery-type buildings consume input resources per second; production halts when inputs are depleted
- **Tick calculation**: Each tick processes all buildings, consuming inputs first, then producing outputs
- **Upgrade scaling**: Upgrade cost follows formula `baseCost * costMultiplier^currentLevel`
- **Max level cap**: Buildings have a maximum level (10) and cannot be upgraded beyond it
- **GameLoop class**: Provides `start()`/`stop()` for the 1-second interval, and `tick(deltaSeconds)` for manual/variable ticks
- **Offline progress**: `calculateOfflineProgress(state, seconds)` runs the loop in 1-second increments for accuracy with consumption buildings
- **Offline cap**: Maximum 8 hours (28,800 seconds) of offline progress to prevent abuse
- **Building unlock**: New buildings start at level 1 after paying the base cost; upgrades increment level
