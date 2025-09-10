export interface MaterialValues {
  hp: number;
  hardness: number;
}

const MATERIALS: Record<string, MaterialValues> = {
  wood: { hp: 20, hardness: 5 },
  stone: { hp: 40, hardness: 8 },
  steel: { hp: 60, hardness: 9 },
};

/**
 * Retrieve durability values for a given material type.
 * Returns 0 hardness and hp if the material is unknown.
 */
export function getMaterialValues(type: string | null | undefined): MaterialValues {
  return MATERIALS[type ?? ""] ?? { hp: 0, hardness: 0 };
}
