import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Returns the models this API key can actually call (that support generateContent),
// so the UI can offer a dropdown instead of guessing model names.
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY is not set." }, { status: 500 });

  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: { "x-goog-api-key": apiKey },
    });
    if (!res.ok) return NextResponse.json({ error: `Could not list models (${res.status}).` }, { status: 502 });
    const data = await res.json();
    const models = (data?.models || [])
      .filter((m: any) => (m?.supportedGenerationMethods || []).includes("generateContent"))
      .map((m: any) => ({
        id: (m?.name || "").replace(/^models\//, ""),
        label: m?.displayName || (m?.name || "").replace(/^models\//, ""),
      }))
      // Keep it to the useful text models (skip embeddings, image/veo, tts, etc.)
      .filter((m: any) => /gemini/i.test(m.id) && !/embedding|image|veo|imagen|tts|aqa|learnlm/i.test(m.id));
    return NextResponse.json({ models });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to list models." }, { status: 500 });
  }
}
