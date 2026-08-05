import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface P { name: string; slot: string; age?: number; rating?: number }

function buildPrompt(club: string, league: string, note: string, players: P[]) {
  const list = players.map((p) => `- ${p.name} (${p.slot}${p.age ? `, ${p.age}y` : ""})`).join("\n");
  return `You are an elite football scout and analyst. Using up-to-date web search, assess the following squad for ${club}, competing in the ${league}. ${note}

SQUAD:
${list}

Look the players up for current form, quality and status, then write a concise but insightful review. Use markdown with these sections and nothing before the first header:

## Verdict
2-3 sentences: overall quality and how well-balanced the squad is, and a realistic ${league} outlook (title/promotion push, mid-table, or struggle).

## Balance by area
Bullet points for Goalkeeper & defence, Midfield, and Attack — strength, depth and any imbalance.

## Standout players
3-4 bullets naming the key men and why.

## Weak spots
3-4 bullets on the thinnest / weakest areas and risks (age, depth, over-reliance).

## Best shape
The formation and style that gets the most from this group (1-2 sentences).

## Priorities
3-4 bullet recommendations (positions to strengthen, who to build around, sell/keep calls).

Be specific and reference real, current information about these players. Keep it tight and readable.`;
}

async function gemini(apiKey: string, model: string, body: any) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    const detail = await res.text().catch(() => "");
    if (res.status === 429 && attempt === 0) { await sleep(9000); continue; }
    const e: any = new Error(`Gemini API error (${res.status}). ${detail.slice(0, 250)}`);
    e.status = res.status; throw e;
  }
  throw new Error("Gemini API error after retry.");
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY is not set on the server." }, { status: 500 });

  let players: P[] = [], club = "the club", league = "the league", note = "", model = DEFAULT_MODEL;
  try {
    const body = await req.json();
    players = Array.isArray(body?.players) ? body.players : [];
    club = body?.club || club;
    league = body?.league || league;
    note = body?.note || "";
    if (body?.model) model = body.model.toString();
  } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  if (players.length === 0) return NextResponse.json({ error: "Add some players first." }, { status: 400 });

  try {
    const data = await gemini(apiKey, model, {
      contents: [{ role: "user", parts: [{ text: buildPrompt(club, league, note, players) }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 3072 },
    });
    const text = (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || "").join("").trim();
    if (!text) return NextResponse.json({ error: "Empty review (possibly rate-limited). Try again shortly." }, { status: 502 });
    return NextResponse.json({ review: text });
  } catch (err: any) {
    const status = err?.status === 429 ? 429 : 500;
    return NextResponse.json({ error: err?.message || "Failed to build review." }, { status });
  }
}
