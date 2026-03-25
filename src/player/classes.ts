export interface ClassDef {
  id: string;
  name: string;
  hpBonus: number;
  attackBonus: number;
  defenseBonus: number;
  specialAbility: string;
  description: string;
}

const classes: ClassDef[] = [
  {
    id: 'spaceMarine',
    name: 'Space Marine',
    hpBonus: 20,
    attackBonus: 3,
    defenseBonus: 2,
    specialAbility: 'Bolter Discipline: +20% attack damage',
    description: 'A transhuman warrior of the Adeptus Astartes. Balanced in all aspects.',
  },
  {
    id: 'inquisitor',
    name: 'Inquisitor',
    hpBonus: 10,
    attackBonus: 4,
    defenseBonus: 1,
    specialAbility: 'Purge the Unclean: +50% damage to Chaos enemies',
    description: 'An agent of the Ordo Malleus. High attack, low defense.',
  },
  {
    id: 'techPriest',
    name: 'Tech-Priest',
    hpBonus: 15,
    attackBonus: 1,
    defenseBonus: 3,
    specialAbility: 'Binary Chant: +30% resource production',
    description: 'A servant of the Machine God. Defensive specialist with industrial knowledge.',
  },
  {
    id: 'commissar',
    name: 'Commissar',
    hpBonus: 12,
    attackBonus: 5,
    defenseBonus: 1,
    specialAbility: 'Summary Execution: Instant kill below 20% HP',
    description: 'A political officer of the Officio Prefectus. Glass cannon with execution ability.',
  },
];

export function getClasses(): ClassDef[] {
  return classes;
}

export function getClassDef(id: string): ClassDef | undefined {
  return classes.find(c => c.id === id);
}

export interface MilestoneBonuses {
  productionMultiplier: number;
  expeditionHpBonus: number;
  extraBuildingSlots: number;
}

export function levelUpExp(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5));
}

export function getMilestoneBonuses(level: number): MilestoneBonuses {
  let productionMultiplier = 1.0;
  let expeditionHpBonus = 0;
  let extraBuildingSlots = 0;

  if (level >= 5) productionMultiplier *= 1.10;
  if (level >= 10) expeditionHpBonus = 20;
  if (level >= 15) extraBuildingSlots = 1;
  if (level >= 20) productionMultiplier *= 1.15;

  return { productionMultiplier, expeditionHpBonus, extraBuildingSlots };
}
