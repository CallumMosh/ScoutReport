import { Slot } from "./squad";

// A realistic, EDITABLE starting roster for West Ham. Positions/ages/market values
// are grounded in current squad data; wages and fees are public-estimate approximations
// (clubs don't publish them) — correct any figure on the Squad tab. Ratings are a
// rough 0-100 scouting overall. After relegation the real squad will differ, so remove
// anyone who's left and add new signings.

export interface PresetPlayer {
  name: string; slot: Slot; age: number; wageKPerWeek: number; feeM: number; contractYears: number; rating: number;
}

export const WEST_HAM_SQUAD: PresetPlayer[] = [
  // GK
  { name: "Alphonse Areola", slot: "GK", age: 33, wageKPerWeek: 90, feeM: 8, contractYears: 2, rating: 78 },
  { name: "Mads Hermansen", slot: "GK", age: 26, wageKPerWeek: 45, feeM: 20, contractYears: 4, rating: 74 },
  // RB
  { name: "Aaron Wan-Bissaka", slot: "RB", age: 28, wageKPerWeek: 90, feeM: 25, contractYears: 3, rating: 80 },
  { name: "Kyle Walker-Peters", slot: "RB", age: 29, wageKPerWeek: 65, feeM: 12, contractYears: 3, rating: 76 },
  // CB
  { name: "Max Kilman", slot: "CB", age: 29, wageKPerWeek: 100, feeM: 30, contractYears: 4, rating: 79 },
  { name: "Konstantinos Mavropanos", slot: "CB", age: 28, wageKPerWeek: 70, feeM: 22, contractYears: 3, rating: 77 },
  { name: "Jean-Clair Todibo", slot: "CB", age: 26, wageKPerWeek: 90, feeM: 35, contractYears: 4, rating: 80 },
  // LB
  { name: "Malick Diouf", slot: "LB", age: 22, wageKPerWeek: 40, feeM: 22, contractYears: 4, rating: 75 },
  { name: "Emerson Palmieri", slot: "LB", age: 31, wageKPerWeek: 70, feeM: 6, contractYears: 2, rating: 73 },
  // DM
  { name: "Tomas Soucek", slot: "DM", age: 31, wageKPerWeek: 90, feeM: 10, contractYears: 2, rating: 76 },
  { name: "Soungoutou Magassa", slot: "DM", age: 22, wageKPerWeek: 40, feeM: 18, contractYears: 4, rating: 73 },
  // CM
  { name: "Mateus Fernandes", slot: "CM", age: 21, wageKPerWeek: 55, feeM: 30, contractYears: 5, rating: 78 },
  { name: "James Ward-Prowse", slot: "CM", age: 31, wageKPerWeek: 100, feeM: 14, contractYears: 2, rating: 77 },
  { name: "Guido Rodriguez", slot: "CM", age: 32, wageKPerWeek: 80, feeM: 5, contractYears: 2, rating: 72 },
  // AM
  { name: "Lucas Paqueta", slot: "AM", age: 29, wageKPerWeek: 150, feeM: 40, contractYears: 3, rating: 82 },
  // RW
  { name: "Jarrod Bowen", slot: "RW", age: 29, wageKPerWeek: 120, feeM: 45, contractYears: 4, rating: 83 },
  { name: "Luis Guilherme", slot: "RW", age: 19, wageKPerWeek: 30, feeM: 12, contractYears: 5, rating: 66 },
  // LW
  { name: "Crysencio Summerville", slot: "LW", age: 24, wageKPerWeek: 85, feeM: 28, contractYears: 4, rating: 78 },
  { name: "Lamadrid", slot: "LW", age: 18, wageKPerWeek: 8, feeM: 0, contractYears: 3, rating: 58 },
  // ST
  { name: "Niclas Fullkrug", slot: "ST", age: 33, wageKPerWeek: 100, feeM: 10, contractYears: 2, rating: 76 },
  { name: "Callum Wilson", slot: "ST", age: 34, wageKPerWeek: 80, feeM: 3, contractYears: 1, rating: 73 },
];
