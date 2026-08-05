"use client";
import React, { useMemo } from "react";
import { C, FONT_D, FONT_B, FONT_M } from "@/lib/theme";
import { Panel, MiniBar, needColor } from "./ui";
import { Dossier } from "@/lib/types";
import {
  Slot, SLOTS, positionSlot, priorityScore, summariseSquad, autoNeeds, resolveNeeds,
  SquadPlayer,
} from "@/lib/squad";
import { ClubProfile } from "@/lib/finance";

export function ShortlistView({ players, shortlist, setShortlist, squad, club, needsOverride, setCurrent, setView }: {
  players: Dossier[]; shortlist: string[]; setShortlist: (ids: string[]) => void; squad: SquadPlayer[];
  club: ClubProfile; needsOverride: Partial<Record<Slot, number>>;
  setCurrent: (d: Dossier) => void; setView: (v: any) => void;
}) {
  const needs = resolveNeeds(autoNeeds(summariseSquad(squad)), needsOverride);
  const listed = useMemo(
    () => shortlist.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Dossier[],
    [shortlist, players]
  );

  const bySlot = useMemo(() => {
    const g: Record<string, Dossier[]> = {};
    listed.forEach((d) => { const s = positionSlot(d.position); (g[s] ||= []).push(d); });
    Object.keys(g).forEach((s) => g[s].sort((a, b) => priorityScore(b, needs) - priorityScore(a, needs)));
    return g;
  }, [listed, needs]);

  const remove = (id: string) => setShortlist(shortlist.filter((x) => x !== id));

  if (listed.length === 0) {
    return <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
      <p style={{ font: `500 15px ${FONT_D}`, letterSpacing: 1 }}>YOUR SHORTLIST IS EMPTY</p>
      <p style={{ font: `400 13px ${FONT_B}`, marginTop: 4 }}>Open a saved dossier and tap “Add to shortlist”. Targets are grouped by position and ranked by priority (fit × how badly you need that slot).</p>
    </div>;
  }

  const orderedSlots = SLOTS.filter((s) => bySlot[s]?.length);

  return (
    <div style={{ marginTop: 16 }}>
      {orderedSlots.map((slot) => (
        <div key={slot} style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ font: `700 16px ${FONT_D}`, color: C.text }}>{slot}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, width: 120 }}>
              <MiniBar value={needs[slot]} color={needColor(needs[slot])} height={5} />
              <span style={{ font: `500 10px ${FONT_M}`, color: needColor(needs[slot]) }}>need {needs[slot]}</span>
            </span>
            <span style={{ flex: 1, height: 1, background: C.lineSoft }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 12 }}>
            {bySlot[slot].map((d, i) => {
              const prio = priorityScore(d, needs);
              const prioCol = prio >= 70 ? C.good : prio >= 50 ? C.warn : C.muted;
              return (
                <div key={d.id} className="sr-card" onClick={() => { setCurrent(d); setView("detail"); }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ font: `700 13px ${FONT_M}`, color: C.faint }}>{i + 1}.</span>
                        <h3 style={{ font: `600 17px/1.1 ${FONT_D}`, textTransform: "uppercase", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</h3>
                      </div>
                      <p style={{ font: `500 11px ${FONT_M}`, color: C.muted, margin: "3px 0 0" }}>{d.club} · {d.marketValue}</p>
                    </div>
                    <button className="sr-x" onClick={(e) => { e.stopPropagation(); remove(d.id); }}>✕</button>
                  </div>
                  <div style={{ display: "flex", gap: 14, marginTop: 12 }}>
                    <Metric label="Priority" value={prio} color={prioCol} />
                    <Metric label="WH fit" value={d.westHamFit.score} color={C.blue} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <span style={{ font: `500 9px ${FONT_D}`, letterSpacing: 1.2, textTransform: "uppercase", color: C.faint }}>{label}</span>
      <div style={{ font: `700 22px ${FONT_D}`, color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}
