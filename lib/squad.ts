// Squad, shortlist and positional-need engine. All money in £m.
import { Dossier } from "./types";
import { ClubProfile, annualAmortisationM, wageAnnualM, bookValueAfterM } from "./finance";

/* -------------------------------- slots ----------------------------------- */
export const SLOTS = ["GK", "RB", "CB", "LB", "DM", "CM", "AM", "RW", "LW", "ST"] as const;
export type Slot = (typeof SLOTS)[number];
export const TARGET_PER_SLOT = 2;

export function positionSlot(position = ""): Slot {
  const p = position.toLowerCase();
  if (/goalkeep|\bgk\b/.test(p)) return "GK";
  if (/right.?back|\brb\b|\brwb\b|right wing.?back/.test(p)) return "RB";
  if (/left.?back|\blb\b|\blwb\b|left wing.?back/.test(p)) return "LB";
  if (/def.?mid|\bdm\b|\bcdm\b|holding|anchor/.test(p)) return "DM";
  if (/att.?mid|\bam\b|\bcam\b|number 10|playmaker/.test(p)) return "AM";
  if (/right.?wing|\brw\b|right winger|right forward/.test(p)) return "RW";
  if (/left.?wing|\blw\b|left winger|left forward/.test(p)) return "LW";
  if (/strik|strike|\bst\b|\bcf\b|centre.?forward|center.?forward|forward/.test(p)) return "ST";
  if (/centre.?back|center.?back|\bcb\b|central def|defender/.test(p)) return "CB";
  if (/mid/.test(p)) return "CM";
  return "CM";
}

/* ---------------------------- squad data model ---------------------------- */
export interface SquadPlayer {
  id: string;
  name: string;
  slot: Slot;
  age: number;
  wageKPerWeek: number;
  feeM: number;         // original transfer fee (0 = academy / free)
  contractYears: number;// remaining years
  rating: number;       // 0-100 overall
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const playerAmortM = (p: { feeM: number; contractYears: number }) =>
  p.feeM > 0 ? annualAmortisationM(p.feeM, p.contractYears) : 0;
export const playerAnnualCostM = (p: SquadPlayer) => wageAnnualM(p.wageKPerWeek) + playerAmortM(p);

export interface SquadSummary {
  squadCostM: number;
  wageBillM: number;
  amortM: number;
  avgAge: number;
  count: number;
  bySlot: Record<Slot, { count: number; avgRating: number; avgAge: number }>;
  age: { u23: number; prime: number; over29: number };
}

export function summariseSquad(squad: SquadPlayer[]): SquadSummary {
  const bySlot = {} as SquadSummary["bySlot"];
  SLOTS.forEach((s) => (bySlot[s] = { count: 0, avgRating: 0, avgAge: 0 }));
  let wage = 0, amort = 0, ageSum = 0, u23 = 0, prime = 0, over29 = 0;
  const ratingSum: Record<string, number> = {}, ageSlot: Record<string, number> = {};
  squad.forEach((p) => {
    wage += wageAnnualM(p.wageKPerWeek);
    amort += playerAmortM(p);
    ageSum += p.age;
    if (p.age <= 23) u23++; else if (p.age >= 29) over29++; else prime++;
    bySlot[p.slot].count++;
    ratingSum[p.slot] = (ratingSum[p.slot] || 0) + p.rating;
    ageSlot[p.slot] = (ageSlot[p.slot] || 0) + p.age;
  });
  SLOTS.forEach((s) => {
    const c = bySlot[s].count;
    bySlot[s].avgRating = c ? Math.round((ratingSum[s] || 0) / c) : 0;
    bySlot[s].avgAge = c ? Math.round((ageSlot[s] || 0) / c) : 0;
  });
  return {
    squadCostM: round1(wage + amort), wageBillM: round1(wage), amortM: round1(amort),
    avgAge: squad.length ? Math.round((ageSum / squad.length) * 10) / 10 : 0,
    count: squad.length, bySlot, age: { u23, prime, over29 },
  };
}

/* --------------------------- positional need ------------------------------ */
// Auto need 0-100 per slot from depth shortfall, low quality and ageing.
export function autoNeeds(summary: SquadSummary): Record<Slot, number> {
  const out = {} as Record<Slot, number>;
  SLOTS.forEach((s) => {
    const d = summary.bySlot[s];
    const depthGap = Math.max(0, TARGET_PER_SLOT - d.count) / TARGET_PER_SLOT; // 0..1
    const qualityGap = d.count ? Math.max(0, (72 - d.avgRating)) / 72 : 1;      // low rating => need
    const ageGap = d.count && d.avgAge >= 30 ? Math.min(1, (d.avgAge - 29) / 6) : 0;
    const need = 100 * (0.55 * depthGap + 0.3 * qualityGap + 0.15 * ageGap);
    out[s] = Math.round(Math.max(0, Math.min(100, need)));
  });
  return out;
}

// Resolve auto vs manual overrides ("" or -1 means auto).
export function resolveNeeds(auto: Record<Slot, number>, overrides: Partial<Record<Slot, number>>): Record<Slot, number> {
  const out = {} as Record<Slot, number>;
  SLOTS.forEach((s) => {
    const o = overrides[s];
    out[s] = o == null || o < 0 ? auto[s] : o;
  });
  return out;
}

export function dossierRating(d: Dossier): number {
  const keys = ["Finishing", "Positioning", "Passing", "Dribbling", "Physical", "Pace"];
  const vals = keys.map((k) => d.attributes?.[k] ?? 0).filter((v) => v > 0);
  if (!vals.length) return d.westHamFit?.score ?? 60;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

// Priority = blend of fit and how badly the position is needed.
export function priorityScore(d: Dossier, needs: Record<Slot, number>): number {
  const slot = positionSlot(d.position);
  const fit = d.westHamFit?.score ?? 60;
  return Math.round(0.55 * fit + 0.45 * (needs[slot] ?? 0));
}

/* ------------------------------- health ----------------------------------- */
export function clubHealth(summary: SquadSummary, club: ClubProfile) {
  const allowance = (club.revenueM * club.scrPct) / 100;
  const ratio = allowance ? summary.squadCostM / allowance : 1; // 1 = at the limit
  const scr = Math.round(Math.max(0, Math.min(100, (1 - (ratio - 0.7) / 0.5) * 100)));
  const slotsCovered = SLOTS.filter((s) => summary.bySlot[s].count >= TARGET_PER_SLOT).length;
  const depth = Math.round((slotsCovered / SLOTS.length) * 100);
  const age = Math.round(Math.max(0, 100 - Math.abs((summary.avgAge || 26) - 26) * 9));
  const overall = Math.round(0.4 * scr + 0.4 * depth + 0.2 * age);
  return { overall, scr, depth, age };
}

/* ------------------------------ persistence ------------------------------- */
const SQUAD_KEY = "scout-room:squad";
const SHORTLIST_KEY = "scout-room:shortlist";
const NEEDS_KEY = "scout-room:needs";

export function loadSquad(): SquadPlayer[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(SQUAD_KEY) || "[]"); } catch { return []; }
}
export function saveSquad(s: SquadPlayer[]) { try { window.localStorage.setItem(SQUAD_KEY, JSON.stringify(s)); } catch {} }

export function loadShortlist(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(SHORTLIST_KEY) || "[]"); } catch { return []; }
}
export function saveShortlist(ids: string[]) { try { window.localStorage.setItem(SHORTLIST_KEY, JSON.stringify(ids)); } catch {} }

export function loadNeeds(): Partial<Record<Slot, number>> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(NEEDS_KEY) || "{}"); } catch { return {}; }
}
export function saveNeeds(n: Partial<Record<Slot, number>>) { try { window.localStorage.setItem(NEEDS_KEY, JSON.stringify(n)); } catch {} }

/* ------------------------------- planner ---------------------------------- */
export function dossierToSquadPlayer(d: Dossier): SquadPlayer {
  const f = d.finance || { feeM: 0, wageKPerWeek: 40, contractYears: 4, agentFeeM: 0 };
  return {
    id: d.id, name: d.name, slot: positionSlot(d.position),
    age: typeof d.age === "number" ? d.age : parseInt(String(d.age)) || 24,
    wageKPerWeek: f.wageKPerWeek, feeM: f.feeM, contractYears: f.contractYears, rating: dossierRating(d),
  };
}

export interface PlanResult {
  before: SquadSummary; after: SummaryPlus;
  netSpendM: number; tradingProfitM: number;
  healthBefore: ReturnType<typeof clubHealth>; healthAfter: ReturnType<typeof clubHealth>;
  scrAllowanceM: number; withinBase: boolean; withinEquity: boolean;
  unmet: Slot[];
}
type SummaryPlus = SquadSummary;

export function simulate(
  squad: SquadPlayer[], incomings: SquadPlayer[], outgoingIds: string[],
  club: ClubProfile, needs: Record<Slot, number>
): PlanResult {
  const before = summariseSquad(squad);
  const outgoing = squad.filter((p) => outgoingIds.includes(p.id));
  const kept = squad.filter((p) => !outgoingIds.includes(p.id));
  const projected = [...kept, ...incomings];
  const after = summariseSquad(projected);

  const inFees = incomings.reduce((a, p) => a + (p.feeM || 0), 0);
  // Approx sale proceeds = residual book value (conservative); profit = sale - book (academy = full).
  const saleProceeds = outgoing.reduce((a, p) => a + bookValueAfterM(p.feeM, p.contractYears, 0), 0);
  const bookOut = outgoing.reduce((a, p) => a + bookValueAfterM(p.feeM, p.contractYears, 0), 0);
  const tradingProfit = saleProceeds - bookOut; // ~0 with this proxy; kept for extension

  const allowance = (club.revenueM * club.scrPct) / 100;
  const withinBase = after.squadCostM <= allowance;
  const withinEquity = after.squadCostM <= allowance + club.equityAllowanceM;

  const unmet = SLOTS.filter((s) => needs[s] >= 45 && after.bySlot[s].count < TARGET_PER_SLOT);

  return {
    before, after,
    netSpendM: round1(inFees - saleProceeds),
    tradingProfitM: round1(tradingProfit),
    healthBefore: clubHealth(before, club), healthAfter: clubHealth(after, club),
    scrAllowanceM: round1(allowance), withinBase, withinEquity, unmet,
  };
}

function round1(n: number) { return Math.round(n * 10) / 10; }
