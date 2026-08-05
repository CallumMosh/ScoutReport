import { NextRequest, NextResponse } from "next/server";
import { SCOUT_SYSTEM, buildResearchPrompt, buildStructureMessage, normalizeDossier } from "@/lib/prompt";
import { withId } from "@/lib/normalize";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

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

async function gemini(apiKey: string, body: any): Promise<any> {
  const res = await fetch(`${BASE}/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini API error (${res.status}). ${detail.slice(0, 300)}`);
  }
  return res.json();
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY is not set on the server." }, { status: 500 });

  let name = "";
  try {
    const body = await req.json();
    name = (body?.name || "").toString().trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!name) return NextResponse.json({ error: "Please provide a player name." }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);

  try {
    // Pass 1 — grounded web research (Google Search enabled).
    const research = await gemini(apiKey, {
      contents: [{ role: "user", parts: [{ text: buildResearchPrompt(name, today) }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
    });
    const notes = partsText(research);
    if (!notes) {
      return NextResponse.json({ error: "Web research returned nothing (possibly rate-limited). Try again in a moment." }, { status: 502 });
    }

    // Pass 2 — structure the fresh notes into the dossier JSON (no tools, JSON mode).
    const structured = await gemini(apiKey, {
      system_instruction: { parts: [{ text: SCOUT_SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: buildStructureMessage(name, notes) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.5,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    const text = partsText(structured);
    if (!text) return NextResponse.json({ error: "Empty reply while structuring the dossier. Try again." }, { status: 502 });

    const raw = extractJson(text);
    const dossier = withId(normalizeDossier(raw, name));
    return NextResponse.json({ dossier });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to build dossier." }, { status: 500 });
  }
}
