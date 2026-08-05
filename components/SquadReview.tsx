"use client";
import React, { useState } from "react";
import { C, FONT_D, FONT_B, FONT_M } from "@/lib/theme";
import { Panel } from "./ui";
import { SquadPlayer } from "@/lib/squad";
import { ClubProfile } from "@/lib/finance";
import { getSavedModel } from "./ModelPicker";

export function SquadReview({ players, club, note, title = "AI squad review" }: {
  players: SquadPlayer[]; club: ClubProfile; note?: string; title?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState("");
  const [error, setError] = useState("");

  const run = async () => {
    if (players.length === 0) { setError("Add players first."); return; }
    setLoading(true); setError(""); setReview("");
    try {
      const res = await fetch("/api/squad-review", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          players: players.map((p) => ({ name: p.name, slot: p.slot, age: p.age, rating: p.rating })),
          club: club.clubName, league: club.league, note: note || "", model: getSavedModel(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to build review.");
      setReview(json.review);
    } catch (e: any) { setError(e?.message || "Something went wrong."); }
    finally { setLoading(false); }
  };

  return (
    <Panel title={title} accent={C.blue} sub="grounded in live web search" style={{ marginTop: 16 }}>
      {!review && (
        <p style={{ font: `400 13px ${FONT_B}`, color: C.faint, marginTop: -6, marginBottom: 12 }}>
          Gemini looks up your {players.length} players and reviews the squad's quality, balance and {club.league} outlook.
        </p>
      )}
      <button className="sr-btn sr-btn--claret" disabled={loading} onClick={run}>
        {loading ? "Analysing squad…" : review ? "Re-run review" : "Get squad review"}
      </button>
      {error && <p style={{ color: C.claret, font: `500 13px ${FONT_M}`, marginTop: 12 }}>{error}</p>}
      {review && <div style={{ marginTop: 16 }}><Markdown text={review} /></div>}
    </Panel>
  );
}

/* ---- tiny markdown renderer: ## headers, ### sub, - bullets, **bold** ---- */
function Markdown({ text }: { text: string }) {
  const lines = text.replace(/```/g, "").split("\n");
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      out.push(
        <ul key={`u${out.length}`} style={{ margin: "6px 0 12px", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          {bullets.map((b, i) => <li key={i} style={{ font: `400 14px/1.5 ${FONT_B}`, color: C.text }}>{inline(b)}</li>)}
        </ul>
      );
      bullets = [];
    }
  };
  lines.forEach((raw) => {
    const line = raw.trimEnd();
    if (/^##\s+/.test(line)) { flush(); out.push(<h3 key={`h${out.length}`} style={{ font: `600 13px ${FONT_D}`, letterSpacing: 1.5, textTransform: "uppercase", color: C.blue, margin: "16px 0 6px" }}>{line.replace(/^##\s+/, "")}</h3>); }
    else if (/^###\s+/.test(line)) { flush(); out.push(<h4 key={`h${out.length}`} style={{ font: `600 13px ${FONT_D}`, color: C.text, margin: "10px 0 4px" }}>{line.replace(/^###\s+/, "")}</h4>); }
    else if (/^[-*]\s+/.test(line)) { bullets.push(line.replace(/^[-*]\s+/, "")); }
    else if (line.trim() === "") { flush(); }
    else { flush(); out.push(<p key={`p${out.length}`} style={{ font: `400 14px/1.6 ${FONT_B}`, color: C.text, margin: "0 0 10px" }}>{inline(line)}</p>); }
  });
  flush();
  return <>{out}</>;
}

function inline(s: string): React.ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    /^\*\*[^*]+\*\*$/.test(p)
      ? <strong key={i} style={{ color: C.text, fontWeight: 600 }}>{p.replace(/\*\*/g, "")}</strong>
      : <React.Fragment key={i}>{p}</React.Fragment>
  );
}
