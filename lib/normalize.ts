import { ATTR_KEYS, PER90_KEYS, Dossier, Rated, Comparable } from "./types";
import { clamp, num, uid } from "./theme";

function str(v: unknown, fallback = "—"): string {
  const s = typeof v === "string" ? v.trim() : v == null ? "" : String(v);
  return s || fallback;
}
function ratedList(v: unknown, n: number): Rated[] {
  const arr = Array.isArray(v) ? v : [];
  const out = arr
    .map((x: any) => ({ title: str(x?.title, ""), detail: str(x?.detail, "") }))
    .filter((r) => r.title || r.detail);
  return out.slice(0, n);
}
function comparables(v: unknown): Comparable[] {
  const arr = Array.isArray(v) ? v : [];
  return arr.map((x: any) => ({ name: str(x?.name, ""), note: str(x?.note, "") })).filter((c) => c.name).slice(0, 4);
}
function strList(v: unknown, n: number): string[] {
  const arr = Array.isArray(v) ? v : [];
  return arr.map((x) => str(x, "")).filter(Boolean).slice(0, n);
}

// Turn arbitrary model output into a safe, fully-populated Dossier (minus id/savedAt).
export function normalizeDossier(raw: any, requestedName: string): Omit<Dossier, "id" | "savedAt"> {
  const attributes: Record<string, number> = {};
  ATTR_KEYS.forEach((k) => (attributes[k] = clamp(raw?.attributes?.[k])));
  const per90: Record<string, number> = {};
  PER90_KEYS.forEach((k) => (per90[k] = num(raw?.per90?.[k])));

  const wh = raw?.westHamFit || {};
  const sub = wh?.subScores || {};

  return {
    name: str(raw?.name, requestedName),
    fullName: str(raw?.fullName, ""),
    club: str(raw?.club),
    league: str(raw?.league),
    position: str(raw?.position),
    secondaryPositions: str(raw?.secondaryPositions, ""),
    age: raw?.age ?? "—",
    dob: str(raw?.dob, ""),
    height: str(raw?.height, ""),
    foot: str(raw?.foot),
    nationality: str(raw?.nationality),
    shirtNumber: str(raw?.shirtNumber, ""),
    statsSeason: str(raw?.statsSeason, ""),

    marketValue: str(raw?.marketValue),
    contractUntil: str(raw?.contractUntil),
    estimatedWage: str(raw?.estimatedWage),
    transferFeeEstimate: str(raw?.transferFeeEstimate),
    valueTrend: str(raw?.valueTrend),
    financialNotes: str(raw?.financialNotes, ""),

    attributes,
    per90,

    summary: str(raw?.summary, ""),
    style: str(raw?.style, ""),
    strengths: ratedList(raw?.strengths, 5),
    weaknesses: ratedList(raw?.weaknesses, 4),
    keyTraits: strList(raw?.keyTraits, 6),
    tacticalRoles: strList(raw?.tacticalRoles, 4),
    bestSystem: str(raw?.bestSystem, ""),
    careerTrajectory: str(raw?.careerTrajectory, ""),
    developmentProjection: str(raw?.developmentProjection, ""),
    injuryProfile: str(raw?.injuryProfile, ""),
    setPieceRole: str(raw?.setPieceRole, ""),
    comparablePlayers: comparables(raw?.comparablePlayers),

    westHamFit: {
      score: clamp(wh?.score),
      verdict: str(wh?.verdict, ""),
      reasoning: str(wh?.reasoning, ""),
      risks: str(wh?.risks, ""),
      subScores: {
        systemFit: clamp(sub?.systemFit),
        styleFit: clamp(sub?.styleFit),
        plReadiness: clamp(sub?.plReadiness),
        value: clamp(sub?.value),
        squadNeed: clamp(sub?.squadNeed),
      },
    },

    recommendation: {
      rating: str(raw?.recommendation?.rating, "Monitor"),
      oneLiner: str(raw?.recommendation?.oneLiner, ""),
    },

    generatedAt: new Date().toISOString(),
  };
}

export function withId(d: Omit<Dossier, "id" | "savedAt">): Dossier {
  return { ...d, id: uid(), savedAt: null };
}
