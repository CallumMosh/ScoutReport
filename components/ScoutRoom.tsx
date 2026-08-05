"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { C, FONT_D, FONT_B, FONT_M, clamp, num, fitColor } from "@/lib/theme";
import { ATTR_KEYS, PER90_KEYS, PER90_CHART_KEYS, Dossier, Rated, posGroup } from "@/lib/types";
import { loadAll, saveDossier, deleteDossier, storageMode } from "@/lib/store";
import { AttributeRadar, CompareRadar, Per90Bars, Per90CompareBars, FitGauge, ScoreBar } from "./charts";
import { useClubProfile, clubContextString, ClubProfileBar, FinancePanel } from "./Finance";
import { ModelPicker, getSavedModel } from "./ModelPicker";

type View = "home" | "detail" | "compare";

export default function ScoutRoom() {
  const [players, setPlayers] = useState<Dossier[]>([]);
  const [view, setView] = useState<View>("home");
  const [current, setCurrent] = useState<Dossier | null>(null);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [cmp, setCmp] = useState<[string | null, string | null]>([null, null]);
  const [model, setModel] = useState<string>("");
  const [club, setClub] = useClubProfile();
  useEffect(() => { setModel(getSavedModel()); }, []);

  useEffect(() => { (async () => { try { setPlayers(await loadAll()); } catch (e: any) { setError(e?.message || ""); } })(); }, []);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  const runScout = useCallback(async (name: string) => {
    const n = name.trim(); if (!n) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/scout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: n, model, clubContext: clubContextString(club) }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to build dossier.");
      const dossier: Dossier = json.dossier;
      const existing = players.find((p) => p.name.toLowerCase() === n.toLowerCase());
      if (existing) { dossier.id = existing.id; dossier.savedAt = existing.savedAt; }
      setCurrent(dossier); setEditing(false); setView("detail"); setQuery("");
      if (json.grounded === false) flash("Rate-limited — built from model knowledge, not live search");
    } catch (e: any) { setError(e?.message || "Something went wrong."); }
    finally { setLoading(false); }
  }, [players, model, club]);

  const save = useCallback(async () => {
    if (!current) return;
    try {
      const saved = await saveDossier(current);
      setCurrent(saved);
      setPlayers((prev) => [saved, ...prev.filter((x) => x.id !== saved.id)]);
      flash("Saved to your shelf");
    } catch (e: any) { flash("Save failed — check Supabase / env"); }
  }, [current]);

  const remove = useCallback(async (id: string) => {
    try { await deleteDossier(id); } catch {}
    setPlayers((prev) => prev.filter((p) => p.id !== id));
    setCmp((c) => c.map((x) => (x === id ? null : x)) as [string | null, string | null]);
    if (current?.id === id) setCurrent((c) => (c ? { ...c, savedAt: null } : c));
    flash("Removed from shelf");
  }, [current]);

  const isSaved = !!(current && players.some((p) => p.id === current.id && p.savedAt));
  const upd = (patch: Partial<Dossier>) => setCurrent((c) => (c ? { ...c, ...patch } : c));

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ height: 4, background: `linear-gradient(90deg, ${C.claretDeep}, ${C.claret} 55%, ${C.blue})` }} />
      <header style={{ maxWidth: 1080, margin: "0 auto", padding: "22px 20px 6px", display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ cursor: "pointer" }} onClick={() => setView("home")}>
          <Eyebrow>Scouting Dossiers · Claret &amp; Blue Lens</Eyebrow>
          <h1 style={{ font: `700 34px/1 ${FONT_D}`, letterSpacing: 0.5, margin: "4px 0 0", textTransform: "uppercase" }}>The Recruitment Room</h1>
        </div>
        <nav style={{ display: "flex", gap: 8 }}>
          <Tab active={view === "home"} onClick={() => setView("home")}>Shelf</Tab>
          <Tab active={view === "compare"} onClick={() => setView("compare")}>Compare</Tab>
        </nav>
      </header>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "10px 20px 60px" }}>
        {view === "home" && <Home {...{ query, setQuery, runScout, loading, error, players, setCurrent, setView, setEditing, remove, club, setClub, model, setModel }} />}
        {view === "detail" && current && <Detail {...{ current, editing, setEditing, upd, save, isSaved, runScout, loading, setView, remove, club }} />}
        {view === "compare" && <Compare {...{ players, cmp, setCmp, setCurrent, setView }} />}
      </main>

      {toast && <div className="sr-toast">{toast}</div>}
      <div style={{ position: "fixed", bottom: 12, left: 12, font: `500 11px ${FONT_M}`, color: C.faint }}>
        {storageMode() === "supabase" ? "Saving to Supabase" : "Saving locally (add Supabase env to sync)"}
      </div>
    </div>
  );
}

/* ------------------------------- HOME ------------------------------------- */
function Home({ query, setQuery, runScout, loading, error, players, setCurrent, setView, setEditing, remove, club, setClub, model, setModel }: any) {
  const groups = useMemo(() => {
    const g: Record<string, Dossier[]> = {};
    players.forEach((p: Dossier) => { const k = posGroup(p.position); (g[k] ||= []).push(p); });
    return g;
  }, [players]);

  return (
    <>
      <ClubProfileBar club={club} onChange={setClub} />
      <section style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 22, marginTop: 14, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -40, top: -40, width: 180, height: 180, background: C.claretGlow, borderRadius: "50%", filter: "blur(10px)" }} />
        <Eyebrow>New assignment</Eyebrow>
        <p style={{ font: `600 20px ${FONT_D}`, margin: "6px 0 14px" }}>Scout any player by name</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runScout(query)}
            placeholder="e.g. Jarrod Bowen, Troy Parrott, Viktor Gyökeres…" className="sr-input" style={{ flex: "1 1 260px" }} />
          <button className="sr-btn sr-btn--claret" disabled={loading || !query.trim()} onClick={() => runScout(query)}>{loading ? "Scouting…" : "Build dossier →"}</button>
        </div>
        {error && <p style={{ color: C.claret, font: `500 13px ${FONT_M}`, marginTop: 12 }}>{error}</p>}
        <p style={{ color: C.faint, font: `400 11px ${FONT_B}`, marginTop: 12, lineHeight: 1.5 }}>
          Each dossier is built from a live web search, so figures track the latest season — but always sanity-check a key stat. Hit <b style={{ color: C.muted }}>Edit</b> on any dossier to correct anything before saving.
        </p>
        <ModelPicker value={model} onChange={setModel} />
      </section>

      {players.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: C.faint }}>
          <div style={{ font: `700 46px ${FONT_D}`, color: C.lineSoft }}>◆</div>
          <p style={{ font: `500 15px ${FONT_D}`, letterSpacing: 1, color: C.muted, marginTop: 8 }}>YOUR SHELF IS EMPTY</p>
          <p style={{ font: `400 13px ${FONT_B}`, marginTop: 4 }}>Scout a player above, then save the dossier to build your shortlist.</p>
        </div>
      ) : (
        Object.entries(groups).map(([grp, list]) => (
          <div key={grp} style={{ marginTop: 30 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <Eyebrow color={C.blue}>{grp}</Eyebrow>
              <span style={{ flex: 1, height: 1, background: C.lineSoft }} />
              <span style={{ font: `500 11px ${FONT_M}`, color: C.faint }}>{list.length}</span>
            </div>
            <div className="sr-grid">
              {list.map((p) => <Card key={p.id} p={p} onOpen={() => { setCurrent(p); setEditing(false); setView("detail"); }} onDelete={() => remove(p.id)} />)}
            </div>
          </div>
        ))
      )}
    </>
  );
}

function Card({ p, onOpen, onDelete }: { p: Dossier; onOpen: () => void; onDelete: () => void }) {
  const col = fitColor(p.westHamFit.score);
  return (
    <div className="sr-card" onClick={onOpen}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ font: `600 19px/1.1 ${FONT_D}`, textTransform: "uppercase", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</h3>
          <p style={{ font: `500 11px ${FONT_M}`, color: C.muted, margin: "4px 0 0" }}>{p.club} · {p.position}</p>
        </div>
        <button className="sr-x" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Remove">✕</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
        <svg width="44" height="44" viewBox="0 0 44 44" style={{ flexShrink: 0 }}>
          <circle cx="22" cy="22" r="19" fill="none" stroke={C.lineSoft} strokeWidth="4" />
          <circle cx="22" cy="22" r="19" fill="none" stroke={col} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 19} strokeDashoffset={2 * Math.PI * 19 * (1 - p.westHamFit.score / 100)} transform="rotate(-90 22 22)" />
          <text x="22" y="26" textAnchor="middle" style={{ font: `700 14px ${FONT_D}`, fill: C.text }}>{p.westHamFit.score}</text>
        </svg>
        <div>
          <span style={{ font: `500 10px ${FONT_D}`, letterSpacing: 1.2, color: C.faint, textTransform: "uppercase" }}>West Ham fit · {p.recommendation.rating}</span>
          <p style={{ font: `400 12px ${FONT_B}`, color: C.muted, margin: "2px 0 0", lineHeight: 1.35, maxWidth: 200 }}>
            {p.westHamFit.verdict || p.westHamFit.reasoning?.slice(0, 74)}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ DETAIL ------------------------------------ */
function Detail({ current, editing, setEditing, upd, save, isSaved, runScout, loading, setView, remove, club }: any) {
  const c: Dossier = current;
  const radarData = ATTR_KEYS.map((k) => ({ attribute: k, value: c.attributes[k] ?? 0 }));
  const per90ChartData = PER90_CHART_KEYS.map((k) => ({ metric: k, value: c.per90[k] ?? 0 }));
  const ratingCol = c.recommendation.rating === "Priority target" ? C.good : c.recommendation.rating === "Pass" ? C.claret : C.warn;
  const sub = c.westHamFit.subScores;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "16px 0 14px", flexWrap: "wrap", gap: 10 }}>
        <button className="sr-back" onClick={() => setView("home")}>← Shelf</button>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="sr-btn sr-btn--ghost" disabled={loading} onClick={() => runScout(c.name)}>{loading ? "…" : "Regenerate"}</button>
          <button className="sr-btn sr-btn--ghost" onClick={() => setEditing((e: boolean) => !e)}>{editing ? "Done editing" : "Edit"}</button>
          <button className="sr-btn sr-btn--claret" onClick={save}>{isSaved ? "Update ✓" : "Save"}</button>
        </div>
      </div>

      {/* Recommendation banner */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, background: C.card, border: `1px solid ${ratingCol}`, borderRadius: 12, padding: "12px 18px", marginBottom: 14 }}>
        <span style={{ font: `700 13px ${FONT_D}`, letterSpacing: 1.5, textTransform: "uppercase", color: ratingCol, whiteSpace: "nowrap" }}>{c.recommendation.rating}</span>
        <span style={{ width: 1, height: 20, background: C.line }} />
        <span style={{ font: `400 14px ${FONT_B}`, color: C.text }}>{c.recommendation.oneLiner}</span>
      </div>

      {/* Header */}
      <section style={{ background: `linear-gradient(135deg, ${C.card}, ${C.bg2})`, border: `1px solid ${C.line}`, borderRadius: 16, padding: "22px 24px" }}>
        {editing ? (
          <input className="sr-input" style={{ font: `700 30px ${FONT_D}`, width: "100%", marginBottom: 10 }} value={c.name} onChange={(e) => upd({ name: e.target.value })} />
        ) : (
          <h2 style={{ font: `700 clamp(28px,5vw,44px)/1 ${FONT_D}`, textTransform: "uppercase", letterSpacing: 0.5, margin: 0 }}>{c.name}</h2>
        )}
        {c.fullName && c.fullName !== "—" && !editing && <p style={{ font: `400 13px ${FONT_M}`, color: C.faint, margin: "4px 0 0" }}>{c.fullName}</p>}
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginTop: 16 }}>
          {editing ? (
            <>
              <EditChip label="Club" v={c.club} on={(x) => upd({ club: x })} />
              <EditChip label="League" v={c.league} on={(x) => upd({ league: x })} />
              <EditChip label="Position" v={c.position} on={(x) => upd({ position: x })} />
              <EditChip label="Age" v={c.age} on={(x) => upd({ age: x })} w={54} />
              <EditChip label="Foot" v={c.foot} on={(x) => upd({ foot: x })} w={80} />
              <EditChip label="Height" v={c.height} on={(x) => upd({ height: x })} w={80} />
              <EditChip label="Nation" v={c.nationality} on={(x) => upd({ nationality: x })} />
            </>
          ) : (
            <>
              <Chip label="Club" value={c.club} /><Chip label="League" value={c.league} />
              <Chip label="Position" value={c.position} />{c.secondaryPositions && c.secondaryPositions !== "—" && <Chip label="Also" value={c.secondaryPositions} />}
              <Chip label="Age" value={c.age} /><Chip label="DOB" value={c.dob} /><Chip label="Height" value={c.height} />
              <Chip label="Foot" value={c.foot} /><Chip label="Nation" value={c.nationality} />{c.shirtNumber && c.shirtNumber !== "—" && <Chip label="No." value={c.shirtNumber} />}
              {c.statsSeason && c.statsSeason !== "—" && <Chip label="Stats from" value={c.statsSeason} />}
            </>
          )}
        </div>
      </section>

      {/* Finance strip */}
      <Panel title="Recruitment & finance" accent={C.blue} style={{ marginTop: 16 }}>
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
          {editing ? (
            <>
              <EditChip label="Market value" v={c.marketValue} on={(x) => upd({ marketValue: x })} w={110} />
              <EditChip label="Contract" v={c.contractUntil} on={(x) => upd({ contractUntil: x })} w={110} />
              <EditChip label="Est. wage" v={c.estimatedWage} on={(x) => upd({ estimatedWage: x })} w={110} />
              <EditChip label="Fee est." v={c.transferFeeEstimate} on={(x) => upd({ transferFeeEstimate: x })} w={110} />
              <EditChip label="Trend" v={c.valueTrend} on={(x) => upd({ valueTrend: x })} w={100} />
            </>
          ) : (
            <>
              <Chip label="Market value" value={c.marketValue} /><Chip label="Contract until" value={c.contractUntil} />
              <Chip label="Est. wage" value={c.estimatedWage} /><Chip label="Fee estimate" value={c.transferFeeEstimate} />
              <Chip label="Value trend" value={c.valueTrend} />
            </>
          )}
        </div>
        {editing ? <textarea className="sr-input" style={{ width: "100%", minHeight: 60, marginTop: 12 }} value={c.financialNotes} onChange={(e) => upd({ financialNotes: e.target.value })} />
          : c.financialNotes && <p style={{ font: `400 14px/1.55 ${FONT_B}`, color: C.muted, marginTop: 12 }}>{c.financialNotes}</p>}
      </Panel>

      {/* Finance engine: amortisation, SCR impact, contract optimiser */}
      <FinancePanel dossier={c} club={club} upd={upd} editing={editing} />

      {/* Summary */}
      <Panel title="Scout summary" accent={C.claret} style={{ marginTop: 16 }}>
        {editing ? <textarea className="sr-input" style={{ width: "100%", minHeight: 70 }} value={c.summary} onChange={(e) => upd({ summary: e.target.value })} />
          : <p style={{ font: `400 15px/1.6 ${FONT_B}`, color: C.text }}>{c.summary}</p>}
      </Panel>

      {/* Radar + WH fit */}
      <div className="sr-radar-row" style={{ marginTop: 16 }}>
        <Panel title="Attribute spread" accent={C.claret} sub="0–100 vs positional peers">
          <AttributeRadar data={radarData} />
          {editing && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 18px", marginTop: 8 }}>
              {ATTR_KEYS.map((k) => (
                <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, font: `500 11px ${FONT_M}`, color: C.muted }}>
                  <span style={{ width: 74 }}>{k}</span>
                  <input type="range" min="0" max="100" value={c.attributes[k] ?? 0} className="sr-range" style={{ flex: 1 }}
                    onChange={(e) => upd({ attributes: { ...c.attributes, [k]: clamp(e.target.value) } })} />
                  <span style={{ width: 22, textAlign: "right", color: C.text }}>{c.attributes[k] ?? 0}</span>
                </label>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="West Ham fit" accent={C.blue} sub={c.westHamFit.verdict}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <FitGauge score={c.westHamFit.score} />
            {editing && <input type="range" min="0" max="100" value={c.westHamFit.score} className="sr-range" style={{ width: "80%" }}
              onChange={(e) => upd({ westHamFit: { ...c.westHamFit, score: clamp(e.target.value) } })} />}
          </div>
          <div style={{ marginTop: 10 }}>
            <ScoreBar label="System fit" value={sub.systemFit} />
            <ScoreBar label="Style fit" value={sub.styleFit} />
            <ScoreBar label="PL ready" value={sub.plReadiness} />
            <ScoreBar label="Value" value={sub.value} />
            <ScoreBar label="Squad need" value={sub.squadNeed} />
          </div>
          {editing ? <textarea className="sr-input" style={{ width: "100%", minHeight: 80, marginTop: 10 }} value={c.westHamFit.reasoning} onChange={(e) => upd({ westHamFit: { ...c.westHamFit, reasoning: e.target.value } })} />
            : <p style={{ font: `400 14px/1.55 ${FONT_B}`, color: C.text, marginTop: 10 }}>{c.westHamFit.reasoning}</p>}
          {c.westHamFit.risks && !editing && <p style={{ font: `400 13px/1.5 ${FONT_B}`, color: C.warn, marginTop: 8 }}><b>Risk:</b> {c.westHamFit.risks}</p>}
        </Panel>
      </div>

      {/* Per90: chart + full table */}
      <div className="sr-radar-row" style={{ marginTop: 16 }}>
        <Panel title="Per 90 output" accent={C.claret} sub="key metrics">
          <Per90Bars data={per90ChartData} />
        </Panel>
        <Panel title="Full per-90 stats" accent={C.blue} sub={c.statsSeason && c.statsSeason !== "—" ? c.statsSeason : undefined}>
          <table className="sr-table">
            <tbody>
              {PER90_KEYS.map((k) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{editing ? (
                    <input className="sr-input" style={{ width: 80, padding: "3px 6px", textAlign: "right", font: `500 12px ${FONT_M}` }} type="number" step="0.01"
                      value={c.per90[k] ?? 0} onChange={(e) => upd({ per90: { ...c.per90, [k]: num(e.target.value) } })} />
                  ) : (c.per90[k] ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      {/* Style + traits/roles */}
      <div className="sr-2col" style={{ marginTop: 16 }}>
        <Panel title="Playing style" accent={C.blue}>
          {editing ? <textarea className="sr-input" style={{ width: "100%", minHeight: 90 }} value={c.style} onChange={(e) => upd({ style: e.target.value })} />
            : <p style={{ font: `400 15px/1.6 ${FONT_B}`, color: C.text }}>{c.style}</p>}
        </Panel>
        <Panel title="Profile" accent={C.claret}>
          <Label>Key traits</Label>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "6px 0 14px" }}>
            {c.keyTraits.map((t, i) => <span key={i} style={{ font: `500 12px ${FONT_M}`, color: C.text, background: C.claretGlow, border: `1px solid ${C.claretDeep}`, borderRadius: 20, padding: "4px 11px" }}>{t}</span>)}
          </div>
          <Label>Tactical roles</Label>
          <ul style={{ margin: "6px 0 14px", paddingLeft: 18, font: `400 14px/1.6 ${FONT_B}`, color: C.text }}>
            {c.tacticalRoles.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
          <Label>Best system</Label>
          <p style={{ font: `500 14px ${FONT_M}`, color: C.blue, marginTop: 4 }}>{c.bestSystem}</p>
        </Panel>
      </div>

      {/* Strengths / weaknesses */}
      <div className="sr-2col" style={{ marginTop: 16 }}>
        <Panel title="Strengths" accent={C.good}><RatedBlock editing={editing} items={c.strengths} color={C.good} on={(v) => upd({ strengths: v })} /></Panel>
        <Panel title="Watch-outs" accent={C.warn}><RatedBlock editing={editing} items={c.weaknesses} color={C.warn} on={(v) => upd({ weaknesses: v })} /></Panel>
      </div>

      {/* Trajectory / projection */}
      <div className="sr-2col" style={{ marginTop: 16 }}>
        <Panel title="Career trajectory" accent={C.blue}>
          {editing ? <textarea className="sr-input" style={{ width: "100%", minHeight: 90 }} value={c.careerTrajectory} onChange={(e) => upd({ careerTrajectory: e.target.value })} />
            : <p style={{ font: `400 14px/1.6 ${FONT_B}`, color: C.text }}>{c.careerTrajectory}</p>}
        </Panel>
        <Panel title="Development projection" accent={C.claret}>
          {editing ? <textarea className="sr-input" style={{ width: "100%", minHeight: 90 }} value={c.developmentProjection} onChange={(e) => upd({ developmentProjection: e.target.value })} />
            : <p style={{ font: `400 14px/1.6 ${FONT_B}`, color: C.text }}>{c.developmentProjection}</p>}
        </Panel>
      </div>

      {/* Injury / set piece / comparables */}
      <div className="sr-2col" style={{ marginTop: 16 }}>
        <Panel title="Availability & set pieces" accent={C.warn}>
          <Label>Injury profile</Label>
          {editing ? <textarea className="sr-input" style={{ width: "100%", minHeight: 56, margin: "6px 0 12px" }} value={c.injuryProfile} onChange={(e) => upd({ injuryProfile: e.target.value })} />
            : <p style={{ font: `400 14px/1.55 ${FONT_B}`, color: C.text, margin: "6px 0 12px" }}>{c.injuryProfile}</p>}
          <Label>Set-piece role</Label>
          {editing ? <textarea className="sr-input" style={{ width: "100%", minHeight: 56, marginTop: 6 }} value={c.setPieceRole} onChange={(e) => upd({ setPieceRole: e.target.value })} />
            : <p style={{ font: `400 14px/1.55 ${FONT_B}`, color: C.text, marginTop: 6 }}>{c.setPieceRole}</p>}
        </Panel>
        <Panel title="Comparable players" accent={C.blue}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {c.comparablePlayers.map((cp, i) => (
              <div key={i} style={{ borderLeft: `2px solid ${C.blue}`, paddingLeft: 12 }}>
                <p style={{ font: `600 14px ${FONT_D}`, textTransform: "uppercase", margin: 0 }}>{cp.name}</p>
                <p style={{ font: `400 13px/1.45 ${FONT_B}`, color: C.muted, margin: "2px 0 0" }}>{cp.note}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        {isSaved && <button className="sr-btn sr-btn--ghost" onClick={() => remove(c.id)} style={{ color: C.claret }}>Remove from shelf</button>}
      </div>
    </>
  );
}

function RatedBlock({ editing, items, on, color }: { editing: boolean; items: Rated[]; on: (v: Rated[]) => void; color: string }) {
  if (editing) {
    return (
      <textarea className="sr-input" style={{ width: "100%", minHeight: 120 }}
        value={items.map((r) => `${r.title} — ${r.detail}`).join("\n")}
        placeholder="One per line as: Title — detail"
        onChange={(e) => on(e.target.value.split("\n").filter((l) => l.trim()).map((l) => {
          const [title, ...rest] = l.split(" — ");
          return { title: (title || "").trim(), detail: rest.join(" — ").trim() };
        }))} />
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((r, i) => (
        <div key={i}>
          <p style={{ font: `600 14px ${FONT_D}`, textTransform: "uppercase", letterSpacing: 0.5, margin: 0, color }}>{r.title}</p>
          <p style={{ font: `400 14px/1.5 ${FONT_B}`, color: C.text, margin: "3px 0 0" }}>{r.detail}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ COMPARE ----------------------------------- */
function Compare({ players, cmp, setCmp, setCurrent, setView }: any) {
  const a: Dossier | undefined = players.find((p: Dossier) => p.id === cmp[0]);
  const b: Dossier | undefined = players.find((p: Dossier) => p.id === cmp[1]);
  const radarData = ATTR_KEYS.map((k) => ({ attribute: k, A: a?.attributes[k] ?? 0, B: b?.attributes[k] ?? 0 }));
  const per90Data = PER90_CHART_KEYS.map((k) => ({ metric: k, A: a?.per90[k] ?? 0, B: b?.per90[k] ?? 0 }));
  const sameRole = a && b && posGroup(a.position) === posGroup(b.position);

  if (players.length < 2) return <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted, font: `500 15px ${FONT_D}`, letterSpacing: 1 }}>SAVE AT LEAST TWO DOSSIERS TO COMPARE THEM</div>;

  return (
    <>
      <div style={{ display: "flex", gap: 14, marginTop: 16, flexWrap: "wrap" }}>
        <Pick label="Player A" color={C.claret} players={players} value={cmp[0]} onChange={(v: string | null) => setCmp([v, cmp[1]])} />
        <Pick label="Player B" color={C.blue} players={players} value={cmp[1]} onChange={(v: string | null) => setCmp([cmp[0], v])} />
      </div>

      {a && b && !sameRole && <p style={{ font: `500 12px ${FONT_M}`, color: C.warn, marginTop: 12 }}>Different roles ({posGroup(a.position)} vs {posGroup(b.position)}) — compare with care.</p>}

      {a && b ? (
        <>
          <Panel title="Attribute overlay" accent={C.claret} style={{ marginTop: 16 }} legend={[[a.name, C.claret], [b.name, C.blue]]}>
            <CompareRadar data={radarData} nameA={a.name} nameB={b.name} />
          </Panel>
          <div className="sr-2col" style={{ marginTop: 16 }}>
            <Panel title="West Ham fit" accent={C.blue}>
              <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
                {[a, b].map((p, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{ font: `700 40px ${FONT_D}`, color: i ? C.blue : C.claret }}>{p.westHamFit.score}</div>
                    <div style={{ font: `500 11px ${FONT_D}`, letterSpacing: 1, color: C.muted, textTransform: "uppercase", maxWidth: 130 }}>{p.name}</div>
                    <div style={{ font: `500 10px ${FONT_M}`, color: C.faint, marginTop: 2 }}>{p.recommendation.rating}</div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Per 90" accent={C.claret} legend={[[a.name, C.claret], [b.name, C.blue]]}>
              <Per90CompareBars data={per90Data} />
            </Panel>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            {[a, b].map((p, i) => <button key={i} className="sr-btn sr-btn--ghost" onClick={() => { setCurrent(p); setView("detail"); }}>Open {p.name} →</button>)}
          </div>
        </>
      ) : <p style={{ color: C.muted, font: `400 14px ${FONT_B}`, marginTop: 24 }}>Pick two players to overlay their profiles.</p>}
    </>
  );
}

function Pick({ label, color, players, value, onChange }: any) {
  return (
    <div style={{ flex: "1 1 220px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
        <span style={{ font: `600 11px ${FONT_D}`, letterSpacing: 1.5, textTransform: "uppercase", color: C.muted }}>{label}</span>
      </div>
      <select className="sr-input" value={value || ""} onChange={(e) => onChange(e.target.value || null)} style={{ width: "100%" }}>
        <option value="">Select…</option>
        {players.map((p: Dossier) => <option key={p.id} value={p.id}>{p.name} — {p.position}</option>)}
      </select>
    </div>
  );
}

/* ------------------------------ shared bits ------------------------------- */
function Panel({ title, sub, accent = C.claret, children, style, legend }: any) {
  return (
    <section style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, ...style }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ width: 3, height: 15, background: accent, borderRadius: 2, flexShrink: 0 }} />
          <h3 style={{ font: `600 13px ${FONT_D}`, letterSpacing: 1.8, textTransform: "uppercase", margin: 0 }}>{title}</h3>
          {sub && <span style={{ font: `400 11px ${FONT_M}`, color: C.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>· {sub}</span>}
        </div>
        {legend && (
          <div style={{ display: "flex", gap: 12 }}>
            {legend.map(([n, col]: [string, string], i: number) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 5, font: `500 11px ${FONT_M}`, color: C.muted }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: col }} />{n}
              </span>
            ))}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}
const Eyebrow = ({ children, color = C.claret }: any) => <span style={{ font: `600 11px ${FONT_D}`, letterSpacing: 2.5, textTransform: "uppercase", color }}>{children}</span>;
const Label = ({ children }: any) => <span style={{ font: `500 10px ${FONT_D}`, letterSpacing: 1.5, textTransform: "uppercase", color: C.faint }}>{children}</span>;
const Chip = ({ label, value }: any) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
    <Label>{label}</Label>
    <span style={{ font: `500 14px ${FONT_M}`, color: C.text }}>{value}</span>
  </div>
);
function Tab({ active, children, ...p }: any) {
  return <button {...p} style={{ font: `600 12px ${FONT_D}`, letterSpacing: 1.5, textTransform: "uppercase", padding: "8px 16px", borderRadius: 8, cursor: "pointer", border: `1px solid ${active ? C.claret : C.line}`, background: active ? C.claretGlow : "transparent", color: active ? C.text : C.muted }}>{children}</button>;
}
function EditChip({ label, v, on, w = 130 }: { label: string; v: any; on: (x: string) => void; w?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Label>{label}</Label>
      <input className="sr-input" style={{ width: w, padding: "5px 8px", font: `500 13px ${FONT_M}` }} value={v} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
