// Server-side web search via Tavily. Returns clean, LLM-ready context text.
// Free tier ~1,000 searches/month, no card. Set TAVILY_API_KEY in the environment.
// If the key is missing or the call fails, returns "" and callers fall back to
// the model's own knowledge.

export async function webContext(query: string, maxResults = 6): Promise<string> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return "";
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        query,
        max_results: maxResults,
        search_depth: "basic",
        include_answer: true,
        topic: "general",
      }),
    });
    if (!res.ok) return "";
    const data = await res.json();
    const parts: string[] = [];
    if (data?.answer) parts.push(`Summary: ${data.answer}`);
    (data?.results || []).forEach((r: any, i: number) => {
      const content = (r?.content || "").toString().slice(0, 700);
      parts.push(`[${i + 1}] ${r?.title || ""}\n${content}\n(${r?.url || ""})`);
    });
    return parts.join("\n\n");
  } catch {
    return "";
  }
}

export const hasTavily = () => !!process.env.TAVILY_API_KEY;
