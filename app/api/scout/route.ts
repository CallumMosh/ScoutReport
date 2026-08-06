import { NextRequest, NextResponse } from "next/server";
import { SCOUT_SYSTEM, buildStructureMessage, normalizeDossier } from "@/lib/prompt";
import { withId } from "@/lib/normalize";
import { webContext } from "@/lib/search";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function extractJson(text: string): any {
  let t = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a === -1 || b === -1) throw new Error("No JSON found in model reply");
  return JSON.parse(t.slice(a, b + 1));
}
function partsText(data: any): string {
  return (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || "").join("");
}

// Gemini general endpoint (no grounding tool) with a single 429 retry.
async function gemini(apiKey: string, model: string, body: any): Promise<any> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${BASE}/${model}:generateContent`, {
      method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": apiKey }, body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    const detail = await res.text().catch(() => "");
    if (res.status === 429 && attempt === 0) { await sleep(9000); continue; }
    const e: any = new Error(`Gemini API error (${res.status}). ${detail.slice(0, 250)}`); e.status = res.status; throw e;
  }
  throw new Error("Gemini API error after retry.");
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY is not set on the server." }, { status: 500 });

  let name = "", model = DEFAULT_MODEL, clubContext = "", search = true;
  try {
    const body = await req.json();
    name = (body?.name || "").toString().trim();
    if (body?.model) model = body.model.toString();
    if (body?.clubContext) clubContext = body.clubContext.toString();
    if (body?.search === false) search = false;
  } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  if (!name) return NextResponse.json({ error: "Please provide a player name." }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);

  try {
    // Fresh web data via Tavily (uses Tavily quota, not Gemini's grounding quota).
    let notes = `(No live web data — use best knowledge as of ${today}.)`;
    let grounded = false;
    if (search) {
      const ctx = await webContext(`${name} footballer current club 2025/26 stats goals assists market value contract transfermarkt`);
      if (ctx) { notes = ctx; grounded = true; }
    }

    // Gemini writes the detailed dossier from those notes — general endpoint, big daily quota.
    const data = await gemini(apiKey, model, {
      system_instruction: { parts: [{ text: SCOUT_SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: buildStructureMessage(name, notes, clubContext) }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.5, maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 0 } },
    });
    const text = partsText(data);
    if (!text) return NextResponse.json({ error: "Empty reply (possibly rate-limited). Try again shortly." }, { status: 502 });

    const raw = extractJson(text);
    const dossier = withId(normalizeDossier(raw, name));
    return NextResponse.json({ dossier, grounded });
  } catch (err: any) {
    const status = err?.status === 429 ? 429 : 500;
    return NextResponse.json({ error: err?.message || "Failed to build dossier.", status }, { status });
  }
}
