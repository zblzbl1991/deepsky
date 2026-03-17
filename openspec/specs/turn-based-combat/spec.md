# turn-based-combat

Simple turn-based combat when the player walks into an enemy.

## Requirements

- **Combat initiation**: Walking into an enemy tile starts combat; movement is blocked during combat
- **Attack action**: Player deals `max(1, playerAttack - enemyDefense) +/- 1` damage to enemy
- **Enemy counterattack**: If enemy survives, deals `max(1, enemyAttack - playerDefense) +/- 1` to player
- **Flee action**: 50% chance to escape; on failure, enemy gets a free hit
- **Combat log**: Array of string messages recording each action for UI display
- **Combat resolution**: Combat ends when player HP <= 0 (death), enemy HP <= 0 (victory), or player flees
- **Victory rewards**: EXP equal to enemy's `exp` value; enemy removed from active enemies list
- **Death handling**: Player death triggers game over; expedition loot is lost (W40K roguelike permadeath-lite)
- **Combat state**: Encapsulated in `CombatState` object with player/enemy HP, attack, defense, fled flag
