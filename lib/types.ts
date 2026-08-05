// Shared types for a scouting dossier.

export const ATTR_KEYS = [
  "Finishing", "Positioning", "Composure", "Pace", "Dribbling", "Passing",
  "Vision", "Aerial", "Physical", "Stamina", "Defending", "Pressing",
] as const;

export const PER90_KEYS = [
  "Goals", "Assists", "xG", "xA", "npxG", "Shots", "Shots on target",
  "Key passes", "Prog. passes", "Prog. carries", "Dribbles", "Tackles won",
  "Interceptions", "Aerials won",
] as const;

// Subset shown in the per-90 bar chart.
export const PER90_CHART_KEYS = ["Goals", "Assists", "xG", "xA", "Shots", "Key passes"] as const;

export type AttrKey = (typeof ATTR_KEYS)[number];
export type Per90Key = (typeof PER90_KEYS)[number];

export interface Rated { title: string; detail: string; }
export interface Comparable { name: string; note: string; }

export interface SubScores {
  systemFit: number;
  styleFit: number;
  plReadiness: number;
  value: number;
  squadNeed: number;
}

export interface WestHamFit {
  score: number;
  verdict: string;      // one-line headline, e.g. "Strong stylistic fit"
  reasoning: string;    // paragraph
  risks: string;        // paragraph
  subScores: SubScores;
}

export interface Recommendation {
  rating: string;       // "Priority target" | "Worth a look" | "Monitor" | "Pass"
  oneLiner: string;
}

export interface Dossier {
  id: string;
  // Identity
  name: string;
  fullName: string;
  club: string;
  league: string;
  position: string;
  secondaryPositions: string;
  age: number | string;
  dob: string;
  height: string;
  foot: string;
  nationality: string;
  shirtNumber: string;
  statsSeason: string;   // e.g. "2025/26" — which season the per-90 numbers come from
  // Finance
  marketValue: string;
  contractUntil: string;
  estimatedWage: string;
  transferFeeEstimate: string;
  valueTrend: string;      // "Rising" | "Stable" | "Falling"
  financialNotes: string;
  // Data
  attributes: Record<string, number>;   // 0-100 vs positional peers
  per90: Record<string, number>;
  // Narrative
  summary: string;
  style: string;
  strengths: Rated[];
  weaknesses: Rated[];
  keyTraits: string[];
  tacticalRoles: string[];
  bestSystem: string;
  careerTrajectory: string;
  developmentProjection: string;
  injuryProfile: string;
  setPieceRole: string;
  comparablePlayers: Comparable[];
  westHamFit: WestHamFit;
  recommendation: Recommendation;
  // Finance
  financeCommentary: string;                 // AI deal-strategy note (SCR/amortisation terms)
  finance?: { feeM: number; wageKPerWeek: number; contractYears: number; agentFeeM: number };
  // Meta
  savedAt: number | null;
  generatedAt: string;
}

export function posGroup(position = ""): string {
  const p = position.toLowerCase();
  if (p.includes("keeper") || /\bgk\b/.test(p)) return "Goalkeeper";
  if (p.includes("back") || p.includes("def") || /\b(cb|rb|lb|rwb|lwb)\b/.test(p)) return "Defender";
  if (p.includes("wing") || p.includes("forward") || p.includes("strik") || /\b(st|cf|lw|rw|fw)\b/.test(p)) return "Forward";
  if (p.includes("mid") || /\b(cm|cdm|cam|dm|am)\b/.test(p)) return "Midfielder";
  return "Outfield";
}
