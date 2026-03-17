# player-classes

W40K character classes with different stat modifiers.

## Requirements

- **4 classes**: Space Marine (balanced), Inquisitor (high attack), Tech-Priest (defensive), Commissar (glass cannon)
- **Class attributes**: Each class defines hpBonus, attackBonus, defenseBonus, specialAbility, and description
- **Lookup**: `getClasses()` returns all class definitions; `getClassDef(id)` returns one by ID
- **Unknown class**: `getClassDef()` returns undefined for nonexistent IDs

## Special Abilities (design only, not yet implemented in combat)

- Space Marine — Bolter Discipline: +20% attack damage
- Inquisitor — Purge the Unclean: +50% damage to Chaos enemies
- Tech-Priest — Binary Chant: +30% resource production
- Commissar — Summary Execution: Instant kill below 20% HP
