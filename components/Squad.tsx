"use client";
import React from "react";
import { C, FONT_D, FONT_B, FONT_M } from "@/lib/theme";
import { Panel, Tile, Label, MiniBar, needColor } from "./ui";
import {
  SquadPlayer, Slot, SLOTS, uid, summariseSquad, autoNeeds, resolveNeeds,
  clubHealth, playerAnnualCostM,
} from "@/lib/squad";
import { ClubProfile } from "@/lib/finance";
import { WEST_HAM_SQUAD } from "@/lib/presetSquad";
import { SquadReview } from "./SquadReview";

export function SquadView({ squad, setSquad, club, needsOverride, setNeedsOverride }: {
  squad: SquadPlayer[]; setSquad: (s: SquadPlayer[]) => void; club: ClubProfile;
  needsOverride: Partial<Record<Slot, number>>; setNeedsOverride: (n: Partial<Record<Slot, number>>) => void;
}) {
  const summary = summariseSquad(squad);
  const needs = resolveNeeds(autoNeeds(summary), needsOverride);
  const health = clubHealth(summary, club);
  const allowance = Math.round((club.revenueM * club.scrPct) / 100);
  const ratioPct = allowance ? Math.round((summary.squadCostM / club.revenueM) * 100) : 0;

  const add = () => setSquad([...squad, { id: uid(), name: "New player", slot: "CM", age: 24, wageKPerWeek: 20, feeM: 0, contractYears: 3, rating: 70 }]);
  const loadPreset = () => {
    if (squad.length > 0 && !window.confirm("Replace the current squad with the West Ham preset?")) return;
    setSquad(WEST_HAM_SQUAD.map((p) => ({ ...p, id: uid() })));
  };
  const upd = (id: string, patch: Partial<SquadPlayer>) => setSquad(squad.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const del = (id: string) => setSquad(squad.filter((p) => p.id !== id));

  return (
    <>
      {/* headline tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: 10, marginTop: 16 }}>
        <Tile label="Squad size" value={`${summary.count}`} />
        <Tile label="Squad cost" value={`£${summary.squadCostM}m`} sub={`wages £${summary.wageBillM}m + amort £${summary.amortM}m`} />
        <Tile label="SCR ratio" value={`${ratioPct}%`} sub={`limit ${club.scrPct}% · £${allowance}m`} accent={ratioPct > club.scrPct ? C.claret : C.good} />
        <Tile label="Avg age" value={`${summary.avgAge || "—"}`} sub={`${summary.age.u23} U23 · ${summary.age.over29} 29+`} />
        <Tile label="Club health" value={`${health.overall}`} sub="0–100" accent={health.overall >= 65 ? C.good : health.overall >= 45 ? C.warn : C.claret} />
      </div>

      {/* depth + need heatmap */}
      <Panel title="Positional depth & need" accent={C.blue} sub="need auto-derived from depth, quality & age" style={{ marginTop: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: 10 }}>
          {SLOTS.map((s) => {
            const d = summary.bySlot[s];
            const need = needs[s];
            const overridden = needsOverride[s] != null && (needsOverride[s] as number) >= 0;
            return (
              <div key={s} style={{ background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 10, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ font: `700 15px ${FONT_D}`, color: C.text }}>{s}</span>
                  <span style={{ font: `500 11px ${FONT_M}`, color: C.muted }}>{d.count} plyr{d.count === 1 ? "" : "s"}{d.count ? ` · ${d.avgRating}` : ""}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                  <MiniBar value={need} color={needColor(need)} />
                  <span style={{ font: `600 12px ${FONT_M}`, color: needColor(need), width: 26, textAlign: "right" }}>{need}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <input type="range" min={-1} max={100} value={needsOverride[s] ?? -1} className="sr-range" style={{ flex: 1 }}
                    onChange={(e) => setNeedsOverride({ ...needsOverride, [s]: +e.target.value })} />
                  <button className="sr-x" title="Back to auto" onClick={() => { const n = { ...needsOverride }; delete n[s]; setNeedsOverride(n); }}>{overridden ? "auto" : "•"}</button>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* roster editor */}
      <Panel title="Current squad" accent={C.claret} style={{ marginTop: 16 }}>
        {squad.length === 0 ? (
          <div>
            <p style={{ font: `400 14px ${FONT_B}`, color: C.muted }}>No players yet. Load the West Ham squad to get started, or add players manually — the finance and health figures update live. All figures are editable estimates.</p>
            <button className="sr-btn sr-btn--claret" style={{ marginTop: 12 }} onClick={loadPreset}>Load West Ham squad</button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
              <thead>
                <tr>{["Name", "Slot", "Age", "£k/wk", "Fee £m", "Yrs", "Rating", "£m/yr", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", font: `500 10px ${FONT_D}`, letterSpacing: 1, textTransform: "uppercase", color: C.faint, padding: "6px 8px", borderBottom: `1px solid ${C.line}` }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {squad.map((p) => (
                  <tr key={p.id}>
                    <td style={cell}><input className="sr-input" style={inp(120)} value={p.name} onChange={(e) => upd(p.id, { name: e.target.value })} /></td>
                    <td style={cell}>
                      <select className="sr-input" style={inp(66)} value={p.slot} onChange={(e) => upd(p.id, { slot: e.target.value as Slot })}>
                        {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={cell}><input className="sr-input" type="number" style={inp(52)} value={p.age} onChange={(e) => upd(p.id, { age: +e.target.value })} /></td>
                    <td style={cell}><input className="sr-input" type="number" style={inp(62)} value={p.wageKPerWeek} onChange={(e) => upd(p.id, { wageKPerWeek: +e.target.value })} /></td>
                    <td style={cell}><input className="sr-input" type="number" step="0.1" style={inp(62)} value={p.feeM} onChange={(e) => upd(p.id, { feeM: +e.target.value })} /></td>
                    <td style={cell}><input className="sr-input" type="number" style={inp(48)} value={p.contractYears} onChange={(e) => upd(p.id, { contractYears: +e.target.value })} /></td>
                    <td style={cell}><input className="sr-input" type="number" style={inp(56)} value={p.rating} onChange={(e) => upd(p.id, { rating: +e.target.value })} /></td>
                    <td style={{ ...cell, font: `500 12px ${FONT_M}`, color: C.muted }}>{Math.round(playerAnnualCostM(p) * 10) / 10}</td>
                    <td style={cell}><button className="sr-x" onClick={() => del(p.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <button className="sr-btn sr-btn--claret" onClick={add}>+ Add player</button>
          <button className="sr-btn sr-btn--ghost" onClick={loadPreset}>Load West Ham squad</button>
        </div>
      </Panel>

      {squad.length > 0 && <SquadReview players={squad} club={club} title="AI review of current squad" />}
    </>
  );
}

const cell: React.CSSProperties = { padding: "5px 8px", borderBottom: `1px solid ${C.lineSoft}` };
const inp = (w: number): React.CSSProperties => ({ width: w, padding: "5px 7px", fontFamily: FONT_M, fontSize: 12 });
