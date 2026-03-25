export function getTechCombatBonus(techUnlocked: string[]): { attack: number; defense: number } {
  let attack = 0;
  let defense = 0;

  for (const techId of techUnlocked) {
    switch (techId) {
      case 'xenoAnalysis':
        attack += 5;
        break;
      case 'voidShielding':
        defense += 5;
        break;
    }
  }

  return { attack, defense };
}
