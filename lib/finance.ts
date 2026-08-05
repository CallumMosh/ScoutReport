// Football-finance engine. All figures in £m unless noted.
// Grounded in 2026/27 rules: Squad Cost Ratio (squad cost = wages + transfer
// amortisation + agents' fees) capped at a % of football income; transfer-fee
// amortisation capped at a maximum of 5 years.

export const AMORTISATION_CAP_YEARS = 5;

export interface ClubProfile {
  clubName: string;
  league: string;          // e.g. "Championship"
  relegated: boolean;      // receiving parachute payments
  revenueM: number;        // total football income incl. parachute payments
  parachuteM: number;      // this season's parachute payment (informational)
  scrPct: number;          // Squad Cost Ratio allowance, % of income (85 default)
  equityAllowanceM: number;// permitted top-up above the ratio, per season
  currentSquadCostM: number;// current annual squad cost (wages + amort + agents)
}

// Sensible starting point: West Ham, just relegated to the Championship 2026/27.
// Every figure is an editable estimate.
export const DEFAULT_CLUB: ClubProfile = {
  clubName: "West Ham United",
  league: "Championship",
  relegated: true,
  revenueM: 140,
  parachuteM: 48,
  scrPct: 85,
  equityAllowanceM: 15,
  currentSquadCostM: 120,
};

export interface DealInputs {
  feeM: number;          // transfer fee
  wageKPerWeek: number;  // gross wage, £k/week
  contractYears: number; // length of contract
  agentFeeM: number;     // agents' fee
}

export function parseMoneyM(s?: string): number {
  if (!s) return 0;
  const m = s.replace(/,/g, "").match(/([\d.]+)/);
  if (!m) return 0;
  let v = parseFloat(m[1]);
  if (/bn|billion/i.test(s)) v *= 1000;
  if (/k(?!\w)/i.test(s) && !/m/i.test(s)) v /= 1000;
  return Math.round(v * 10) / 10;
}

export const wageAnnualM = (wageKPerWeek: number) => (wageKPerWeek * 52) / 1000;

// Annual transfer-fee amortisation, applying the 5-year cap.
export function annualAmortisationM(feeM: number, contractYears: number): number {
  const period = Math.min(Math.max(contractYears, 1), AMORTISATION_CAP_YEARS);
  return feeM / period;
}

export function agentAnnualM(agentFeeM: number, contractYears: number): number {
  const period = Math.min(Math.max(contractYears, 1), AMORTISATION_CAP_YEARS);
  return agentFeeM / period;
}

// Straight-line book (residual) value after N completed seasons.
export function bookValueAfterM(feeM: number, contractYears: number, seasonsElapsed: number): number {
  const period = Math.min(Math.max(contractYears, 1), AMORTISATION_CAP_YEARS);
  const remaining = Math.max(period - seasonsElapsed, 0);
  return Math.round((feeM * (remaining / period)) * 10) / 10;
}

export interface SigningResult {
  annualAmortM: number;
  wageM: number;
  agentM: number;
  annualSquadCostAddM: number;   // total added to squad cost per year
  scrAllowanceM: number;         // base ratio allowance
  scrAllowanceWithEquityM: number;
  currentRatioPct: number;
  newRatioPct: number;
  headroomBeforeM: number;
  headroomAfterM: number;
  withinBase: boolean;
  withinEquity: boolean;
}

export function evaluateSigning(deal: DealInputs, club: ClubProfile): SigningResult {
  const annualAmortM = annualAmortisationM(deal.feeM, deal.contractYears);
  const wageM = wageAnnualM(deal.wageKPerWeek);
  const agentM = agentAnnualM(deal.agentFeeM, deal.contractYears);
  const annualSquadCostAddM = annualAmortM + wageM + agentM;

  const scrAllowanceM = (club.revenueM * club.scrPct) / 100;
  const scrAllowanceWithEquityM = scrAllowanceM + club.equityAllowanceM;
  const newSquadCostM = club.currentSquadCostM + annualSquadCostAddM;

  return {
    annualAmortM: round1(annualAmortM),
    wageM: round1(wageM),
    agentM: round1(agentM),
    annualSquadCostAddM: round1(annualSquadCostAddM),
    scrAllowanceM: round1(scrAllowanceM),
    scrAllowanceWithEquityM: round1(scrAllowanceWithEquityM),
    currentRatioPct: Math.round((club.currentSquadCostM / club.revenueM) * 100),
    newRatioPct: Math.round((newSquadCostM / club.revenueM) * 100),
    headroomBeforeM: round1(scrAllowanceM - club.currentSquadCostM),
    headroomAfterM: round1(scrAllowanceM - newSquadCostM),
    withinBase: newSquadCostM <= scrAllowanceM,
    withinEquity: newSquadCostM <= scrAllowanceWithEquityM,
  };
}

export interface ContractRow {
  years: number;
  annualAmortM: number;
  totalWageCommitmentM: number;
  atCap: boolean;
}

export function contractOptions(deal: DealInputs): ContractRow[] {
  return [3, 4, 5, 6, 7].map((years) => ({
    years,
    annualAmortM: round1(annualAmortisationM(deal.feeM, years)),
    totalWageCommitmentM: round1(wageAnnualM(deal.wageKPerWeek) * years),
    atCap: years > AMORTISATION_CAP_YEARS,
  }));
}

function round1(n: number) { return Math.round(n * 10) / 10; }

/* ------------------------------ persistence ------------------------------- */
const CLUB_KEY = "scout-room:club";
export function loadClub(): ClubProfile {
  if (typeof window === "undefined") return DEFAULT_CLUB;
  try {
    const raw = window.localStorage.getItem(CLUB_KEY);
    return raw ? { ...DEFAULT_CLUB, ...JSON.parse(raw) } : DEFAULT_CLUB;
  } catch { return DEFAULT_CLUB; }
}
export function saveClub(p: ClubProfile) {
  try { window.localStorage.setItem(CLUB_KEY, JSON.stringify(p)); } catch {}
}
