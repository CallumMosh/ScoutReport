import { NextRequest, NextResponse } from "next/server";
import { SCOUT_SYSTEM, buildResearchPrompt, buildStructureMessage, normalizeDossier } from "@/lib/prompt";
import { withId } from "@/lib/normalize";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function extractJson(text: string): any {
  let t = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a === -1 || b === -1) throw new Error("No JSON found in model reply");
  return JSON.parse(t.slice(a, b + 1));
}
function partsText(data: any): string {
  return (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || "").join("");
}

// One call, with a single automatic retry on 429 (rate limit).
async function gemini(apiKey: string, model: string, body: any): Promise<any> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    const detail = await res.text().catch(() => "");
    if (res.status === 429 && attempt === 0) { await sleep(9000); continue; } // wait then retry once
    const e: any = new Error(`Gemini API error (${res.status}). ${detail.slice(0, 250)}`);
    e.status = res.status;
    throw e;
  }
  throw new Error("Gemini API error after retry.");
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY is not set on the server." }, { status: 500 });

  let name = "", model = DEFAULT_MODEL, clubContext = "";
  try {
    const body = await req.json();
    name = (body?.name || "").toString().trim();
    if (body?.model) model = body.model.toString();
    if (body?.clubContext) clubContext = body.clubContext.toString();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!name) return NextResponse.json({ error: "Please provide a player name." }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  const structureBody = (notes: string) => ({
    system_instruction: { parts: [{ text: SCOUT_SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: buildStructureMessage(name, notes, clubContext) }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.5, maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 0 } },
  });

  try {
    let notes = "";
    let grounded = true;
    // Pass 1 — grounded web research.
    try {
      const research = await gemini(apiKey, model, {
        contents: [{ role: "user", parts: [{ text: buildResearchPrompt(name, today) }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
      });
      notes = partsText(research);
    } catch (e: any) {
      // If research is rate-limited/unavailable, fall back to model knowledge (no web).
      if (e?.status === 429) { grounded = false; notes = `(No live web data available — use best knowledge as of ${today}.)`; }
      else throw e;
    }
    if (!notes) { grounded = false; notes = `(No research returned — use best knowledge as of ${today}.)`; }

    // Pass 2 — structure into dossier JSON.
    const structured = await gemini(apiKey, model, structureBody(notes));
    const text = partsText(structured);
    if (!text) return NextResponse.json({ error: "Empty reply while structuring the dossier. Try again." }, { status: 502 });

    const raw = extractJson(text);
    const dossier = withId(normalizeDossier(raw, name));
    return NextResponse.json({ dossier, grounded });
  } catch (err: any) {
    const status = err?.status === 429 ? 429 : 500;
    return NextResponse.json({ error: err?.message || "Failed to build dossier.", status }, { status });
  }
}
