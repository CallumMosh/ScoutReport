"use client";
import React, { useMemo, useState } from "react";
import { C, FONT_D, FONT_B, FONT_M } from "@/lib/theme";
import { Panel, Tile, MiniBar } from "./ui";
import { Dossier } from "@/lib/types";
import {
  SquadPlayer, Slot, SLOTS, positionSlot, dossierToSquadPlayer, simulate,
  autoNeeds, resolveNeeds, summariseSquad,
} from "@/lib/squad";
import { ClubProfile } from "@/lib/finance";

export function PlannerView({ players, shortlist, squad, club, needsOverride }: {
  players: Dossier[]; shortlist: string[]; squad: SquadPlayer[]; club: ClubProfile;
  needsOverride: Partial<Record<Slot, number>>;
}) {
  const [inIds, setInIds] = useState<string[]>([]);   // dossier ids coming in
  const [outIds, setOutIds] = useState<string[]>([]); // squad ids going out

  const shortlistDossiers = useMemo(
    () => shortlist.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Dossier[],
    [shortlist, players]
  );

  const incomings = useMemo(
    () => shortlistDossiers.filter((d) => inIds.includes(d.id)).map(dossierToSquadPlayer),
    [shortlistDossiers, inIds]
  );

  const needs = resolveNeeds(autoNeeds(summariseSquad(squad)), needsOverride);
  const plan = useMemo(() => simulate(squad, incomings, outIds, club, needs), [squad, incomings, outIds, club, needs]);

  const toggle = (arr: string[], set: (v: string[]) => void, id: string) =>
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const status = plan.withinBase ? { t: "Within SCR", c: C.good } : plan.withinEquity ? { t: "Uses equity allowance", c: C.warn } : { t: "Breaches SCR", c: C.claret };
  const ratioAfter = Math.round((plan.after.squadCostM / club.revenueM) * 100);
  const ratioBefore = Math.round((plan.before.squadCostM / club.revenueM) * 100);

  return (
    <>
      {/* projected outcome */}
      <Panel title="Projected outcome" accent={C.blue} sub={`${club.clubName} · ${club.league}`} style={{ marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ font: `600 11px ${FONT_M}`, color: status.c, border: `1px solid ${status.c}`, borderRadius: 20, padding: "2px 10px" }}>{status.t}</span>
          {plan.unmet.length > 0 && <span style={{ font: `500 12px ${FONT_M}`, color: C.warn }}>Still a priority: {plan.unmet.join(", ")}</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: 10 }}>
          <Tile label="Squad cost" value={`£${plan.after.squadCostM}m`} sub={`was £${plan.before.squadCostM}m`} accent={plan.after.squadCostM > plan.before.squadCostM ? C.warn : C.good} />
          <Tile label="SCR ratio" value={`${ratioAfter}%`} sub={`was ${ratioBefore}% · limit ${club.scrPct}%`} accent={ratioAfter > club.scrPct ? C.claret : C.good} />
          <Tile label="Net spend" value={`£${plan.netSpendM}m`} sub="fees in − sales out" />
          <Tile label="Wage bill" value={`£${plan.after.wageBillM}m`} sub={`was £${plan.before.wageBillM}m`} />
          <Tile label="Avg age" value={`${plan.after.avgAge || "—"}`} sub={`was ${plan.before.avgAge || "—"}`} />
        </div>

        {/* health before/after */}
        <div style={{ marginTop: 16 }}>
          {([["Overall", "overall"], ["SCR headroom", "scr"], ["Squad depth", "depth"], ["Age balance", "age"]] as const).map(([label, key]) => {
            const b = (plan.healthBefore as any)[key], a = (plan.healthAfter as any)[key];
            const col = a >= 65 ? C.good : a >= 45 ? C.warn : C.claret;
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, margin: "7px 0" }}>
                <span style={{ width: 110, font: `500 11px ${FONT_M}`, color: C.muted }}>{label}</span>
                <MiniBar value={a} color={col} />
                <span style={{ width: 74, textAlign: "right", font: `500 12px ${FONT_M}`, color: C.text }}>{b} → {a}</span>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* incomings */}
      <Panel title="Transfers in" accent={C.good} sub="from your shortlist" style={{ marginTop: 16 }}>
        {shortlistDossiers.length === 0 ? (
          <p style={{ font: `400 14px ${FONT_B}`, color: C.muted }}>Add players to your shortlist first, then pick who comes in here.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shortlistDossiers.map((d) => {
              const on = inIds.includes(d.id);
              const sp = dossierToSquadPlayer(d);
              return (
                <Row key={d.id} on={on} onClick={() => toggle(inIds, setInIds, d.id)} accent={C.good}
                  left={`${d.name}`} mid={`${sp.slot} · ${sp.age}y · ${d.marketValue}`}
                  right={`£${sp.feeM}m · ${sp.wageKPerWeek}k/wk`} />
              );
            })}
          </div>
        )}
      </Panel>

      {/* outgoings */}
      <Panel title="Transfers out" accent={C.claret} sub="from your current squad" style={{ marginTop: 16 }}>
        {squad.length === 0 ? (
          <p style={{ font: `400 14px ${FONT_B}`, color: C.muted }}>Add your current squad on the Squad tab to model departures.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {squad.map((p) => {
              const on = outIds.includes(p.id);
              return (
                <Row key={p.id} on={on} onClick={() => toggle(outIds, setOutIds, p.id)} accent={C.claret}
                  left={p.name} mid={`${p.slot} · ${p.age}y · rating ${p.rating}`}
                  right={`£${p.wageKPerWeek}k/wk`} strike={on} />
              );
            })}
          </div>
        )}
      </Panel>
    </>
  );
}

function Row({ on, onClick, left, mid, right, accent, strike }: { on: boolean; onClick: () => void; left: string; mid: string; right: string; accent: string; strike?: boolean }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, textAlign: "left",
      background: on ? C.bg2 : "transparent", border: `1px solid ${on ? accent : C.line}`, borderRadius: 10, padding: "9px 12px", cursor: "pointer",
    }}>
      <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${on ? accent : C.line}`, background: on ? accent : "transparent", flexShrink: 0 }} />
        <span style={{ font: `600 14px ${FONT_D}`, textTransform: "uppercase", color: C.text, textDecoration: strike ? "line-through" : "none" }}>{left}</span>
        <span style={{ font: `500 11px ${FONT_M}`, color: C.muted }}>{mid}</span>
      </span>
      <span style={{ font: `500 11px ${FONT_M}`, color: C.faint, whiteSpace: "nowrap" }}>{right}</span>
    </button>
  );
}
