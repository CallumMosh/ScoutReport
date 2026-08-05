import { ATTR_KEYS, PER90_KEYS, type Dossier } from "./types";
import { normalizeDossier } from "./normalize";

// ---- Pass 1: grounded web research (uses Google Search) ----
export function buildResearchPrompt(name: string, today: string) {
  return `You are a football (soccer) scouting researcher. Using up-to-date web search, compile a CURRENT briefing on the player "${name}" as of ${today}.

Search the web and prioritise the MOST RECENT season and latest news. Include, and clearly state the SOURCE SEASON or DATE for each where relevant:
- Current club, league, and the season currently being played.
- Age, date of birth, height, preferred foot, nationality, shirt number.
- Recent per-90 statistics AND season totals (goals, assists, xG, xA, npxG, shots, shots on target, key passes, progressive passes, progressive carries, dribbles, tackles won, interceptions, aerials won) — note which season/competition they come from.
- Current market value and contract expiry (Transfermarkt-style), plus a realistic wage/fee view.
- Playing style, main strengths and weaknesses, tactical roles, set-piece duties.
- Recent form, transfer rumours or news, and injury history.
- 3 stylistically comparable players.

Write detailed notes (not JSON). Be concrete and cite the season/date of key stats. If sources disagree, prefer the newest. State the primary season the stats are drawn from at the end as: "PRIMARY STATS SEASON: <e.g. 2025/26>".`;
}

// ---- Pass 2: structure the fresh research into the dossier JSON ----
export const SCOUT_SYSTEM = `You are an elite football (soccer) recruitment scout writing a full dossier for a Premier League club's analytics department. You will be given fresh, web-researched notes about a player. Convert them into a DETAILED scouting dossier as STRICT JSON only — no markdown, no backticks, no text outside the JSON object.

Rules:
- Base every FACT (club, stats, value, contract, age) on the provided research notes. Do NOT invent figures that contradict the notes. Where the notes are silent, use careful judgement.
- "statsSeason" = the season the per-90 numbers are drawn from (e.g. "2025/26"), taken from the research.
- "attributes" are 0-100 percentile-style ratings versus other players IN THE SAME POSITION. Adapt to the role (a defender has low Finishing, a keeper very low outfield stats). Avoid a lazy 50 unless truly average.
- "per90" are the researched per-90 statistics as plain numbers. Fill every key (use 0 if genuinely not applicable).
- Write full, informative prose for every text field — real scouting work, not one-line stubs.
- "westHamFit" assesses fit for West Ham United (Premier League, London Stadium, claret & blue): weigh system fit, style, Premier League readiness, transfer/wage value, and squad need. Overall 0-100 score PLUS five 0-100 sub-scores.
- "comparablePlayers" = 3 stylistically similar players with a short note each.
- "recommendation.rating" must be one of: "Priority target", "Worth a look", "Monitor", "Pass".

Return EXACTLY this JSON shape and nothing else:
{
  "name": string, "fullName": string, "club": string, "league": string,
  "position": string, "secondaryPositions": string, "age": number, "dob": string,
  "height": string, "foot": string, "nationality": string, "shirtNumber": string,
  "statsSeason": string,
  "marketValue": string, "contractUntil": string, "estimatedWage": string,
  "transferFeeEstimate": string, "valueTrend": string, "financialNotes": string,
  "attributes": { ${ATTR_KEYS.map((k) => `"${k}": number`).join(", ")} },
  "per90": { ${PER90_KEYS.map((k) => `"${k}": number`).join(", ")} },
  "summary": string,
  "style": string,
  "strengths": [ {"title": string, "detail": string} x5 ],
  "weaknesses": [ {"title": string, "detail": string} x4 ],
  "keyTraits": [ string x5 ],
  "tacticalRoles": [ string x3 ],
  "bestSystem": string,
  "careerTrajectory": string,
  "developmentProjection": string,
  "injuryProfile": string,
  "setPieceRole": string,
  "comparablePlayers": [ {"name": string, "note": string} x3 ],
  "westHamFit": {
    "score": number,
    "verdict": string,
    "reasoning": string,
    "risks": string,
    "subScores": { "systemFit": number, "styleFit": number, "plReadiness": number, "value": number, "squadNeed": number }
  },
  "recommendation": { "rating": string, "oneLiner": string },
  "financeCommentary": string
}

FINANCE COMMENTARY (financeCommentary): 3-5 sentences of concrete recruitment-finance strategy for THIS player and the acquiring club described in the user message. Use correct terminology and reason about:
- transfer-fee AMORTISATION (annual charge = fee ÷ contract length, capped at a 5-year amortisation period) and how contract length changes the annual book cost;
- the SQUAD COST RATIO (SCR): squad cost (wages + amortisation + agents' fees) as a % of football income, and whether this deal pressures that ratio;
- if the club is relegated / in the Championship: PARACHUTE PAYMENTS inflating the income base and the Championship SCR allowance, and the risk when parachutes taper;
- BOOK VALUE / resale: signing younger players on longer deals preserves trading value; academy/"pure profit" sales help the ratio.
Recommend an optimal contract length and explain the SCR trade-off. Be specific to the club context given.

Length guide (detailed but not rambling): summary 2-3 sentences; style 3-4 sentences; each strength/weakness detail 1-2 sentences; careerTrajectory, developmentProjection, westHamFit.reasoning 2-4 sentences each; injuryProfile and setPieceRole 1-2 sentences. Return ONLY the JSON object.`;

export function buildStructureMessage(name: string, research: string, clubContext: string) {
  return `Player: ${name}\n\nAcquiring club context (for westHamFit and financeCommentary):\n${clubContext}\n\nFresh web-researched notes to convert into the dossier JSON:\n\n${research}`;
}

// Re-export for the API route.
export { normalizeDossier };
export type { Dossier };
