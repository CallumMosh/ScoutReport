"use client";
import React, { useState, useEffect } from "react";
import { C, FONT_D, FONT_B, FONT_M } from "@/lib/theme";
import { Dossier } from "@/lib/types";
import {
  ClubProfile, DealInputs, DEFAULT_CLUB, loadClub, saveClub, parseMoneyM,
  evaluateSigning, contractOptions, AMORTISATION_CAP_YEARS,
} from "@/lib/finance";

/* --------------------------- club profile state --------------------------- */
export function useClubProfile(): [ClubProfile, (p: ClubProfile) => void] {
  const [club, setClub] = useState<ClubProfile>(DEFAULT_CLUB);
  useEffect(() => { setClub(loadClub()); }, []);
  const update = (p: ClubProfile) => { setClub(p); saveClub(p); };
  return [club, update];
}

export function clubContextString(c: ClubProfile): string {
  return `Club: ${c.clubName}. League: ${c.league}. ${c.relegated ? "Recently RELEGATED and receiving parachute payments." : "Not relegated."} ` +
    `Football income ~£${c.revenueM}m (incl. parachutes ~£${c.parachuteM}m). Squad Cost Ratio allowance ${c.scrPct}% of income, plus ~£${c.equityAllowanceM}m equity top-up per season. Current annual squad cost ~£${c.currentSquadCostM}m. Assess signings against this SCR position.`;
}

/* ------------------------------ club bar ---------------------------------- */
export function ClubProfileBar({ club, onChange }: { club: ClubProfile; onChange: (p: ClubProfile) => void }) {
  const [open, setOpen] = useState(false);
  const allowance = Math.round((club.revenueM * club.scrPct) / 100);
  const set = (patch: Partial<ClubProfile>) => onChange({ ...club, ...patch });

  return (
    <section style={{ background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 16px", marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ font: `600 11px ${FONT_D}`, letterSpacing: 2, textTransform: "uppercase", color: C.blue }}>Club finances</span>
          <span style={{ font: `500 13px ${FONT_M}`, color: C.text }}>{club.clubName} · {club.league}</span>
          <span style={{ font: `500 12px ${FONT_M}`, color: C.muted }}>SCR allowance ≈ £{allowance}m ({club.scrPct}% of £{club.revenueM}m)</span>
        </div>
        <button className="sr-btn sr-btn--ghost" style={{ padding: "6px 12px" }} onClick={() => setOpen((o) => !o)}>{open ? "Close" : "Edit"}</button>
      </div>
      {open && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: 12, marginTop: 14 }}>
          <Field label="Club name" text value={club.clubName} on={(v) => set({ clubName: v })} />
          <Field label="League" text value={club.league} on={(v) => set({ league: v })} />
          <Field label="Income £m" value={club.revenueM} on={(v) => set({ revenueM: +v })} />
          <Field label="Parachute £m" value={club.parachuteM} on={(v) => set({ parachuteM: +v })} />
          <Field label="SCR %" value={club.scrPct} on={(v) => set({ scrPct: +v })} />
          <Field label="Equity top-up £m" value={club.equityAllowanceM} on={(v) => set({ equityAllowanceM: +v })} />
          <Field label="Current squad cost £m" value={club.currentSquadCostM} on={(v) => set({ currentSquadCostM: +v })} />
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={lblStyle}>Relegated</span>
            <button className="sr-btn sr-btn--ghost" style={{ padding: "8px 10px" }} onClick={() => set({ relegated: !club.relegated })}>{club.relegated ? "Yes · parachutes" : "No"}</button>
          </label>
        </div>
      )}
    </section>
  );
}

/* ---------------------------- finance panel ------------------------------- */
export function FinancePanel({ dossier, club, upd, editing }: { dossier: Dossier; club: ClubProfile; upd: (p: Partial<Dossier>) => void; editing: boolean }) {
  const deal: DealInputs = dossier.finance ?? {
    feeM: parseMoneyM(dossier.marketValue) || 10,
    wageKPerWeek: 40,
    contractYears: 4,
    agentFeeM: Math.round((parseMoneyM(dossier.marketValue) || 10) * 0.1 * 10) / 10,
  };
  const setDeal = (patch: Partial<DealInputs>) => upd({ finance: { ...deal, ...patch } });

  const r = evaluateSigning(deal, club);
  const rows = contractOptions(deal);
  const status = r.withinBase ? { t: "Within SCR", c: C.good } : r.withinEquity ? { t: "Uses equity allowance", c: C.warn } : { t: "Breaches SCR", c: C.claret };

  // SCR bar scaled so 100% of income = full width.
  const pct = (m: number) => Math.max(0, Math.min(100, (m / club.revenueM) * 100));

  return (
    <section style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ width: 3, height: 15, background: C.blue, borderRadius: 2 }} />
        <h3 style={{ font: `600 13px ${FONT_D}`, letterSpacing: 1.8, textTransform: "uppercase", margin: 0 }}>Deal finance & SCR impact</h3>
        <span style={{ font: `600 11px ${FONT_M}`, color: status.c, border: `1px solid ${status.c}`, borderRadius: 20, padding: "2px 10px" }}>{status.t}</span>
      </div>

      {/* deal inputs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px,1fr))", gap: 12 }}>
        <Field label="Fee £m" value={deal.feeM} on={(v) => setDeal({ feeM: +v })} />
        <Field label="Wage £k/wk" value={deal.wageKPerWeek} on={(v) => setDeal({ wageKPerWeek: +v })} />
        <Field label="Contract yrs" value={deal.contractYears} on={(v) => setDeal({ contractYears: +v })} />
        <Field label="Agent fee £m" value={deal.agentFeeM} on={(v) => setDeal({ agentFeeM: +v })} />
      </div>

      {/* computed tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: 10, marginTop: 14 }}>
        <Tile label="Annual amortisation" value={`£${r.annualAmortM}m`} sub={deal.contractYears > AMORTISATION_CAP_YEARS ? "capped at 5 yrs" : `fee ÷ ${deal.contractYears} yrs`} />
        <Tile label="Annual squad-cost add" value={`£${r.annualSquadCostAddM}m`} sub="amort + wage + agent" />
        <Tile label="New SCR ratio" value={`${r.newRatioPct}%`} sub={`was ${r.currentRatioPct}% · limit ${club.scrPct}%`} accent={r.newRatioPct > club.scrPct ? C.claret : C.good} />
        <Tile label="Headroom after" value={`£${r.headroomAfterM}m`} sub={`of £${r.scrAllowanceM}m allowance`} accent={r.headroomAfterM < 0 ? C.claret : C.good} />
      </div>

      {/* SCR bar */}
      <div style={{ marginTop: 16 }}>
        <div style={{ position: "relative", height: 22, background: C.lineSoft, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct(club.currentSquadCostM)}%`, background: C.blueDeep }} />
          <div style={{ position: "absolute", left: `${pct(club.currentSquadCostM)}%`, top: 0, bottom: 0, width: `${pct(r.annualSquadCostAddM)}%`, background: r.newRatioPct > club.scrPct ? C.claret : C.good }} />
          {/* allowance marker */}
          <div style={{ position: "absolute", left: `${club.scrPct}%`, top: -3, bottom: -3, width: 2, background: C.text }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, font: `500 10px ${FONT_M}`, color: C.faint }}>
          <span>Current squad cost £{club.currentSquadCostM}m</span>
          <span style={{ color: C.text }}>SCR limit {club.scrPct}%</span>
          <span>Income £{club.revenueM}m</span>
        </div>
      </div>

      {/* contract optimiser */}
      <p style={{ font: `600 11px ${FONT_D}`, letterSpacing: 1.5, textTransform: "uppercase", color: C.faint, margin: "18px 0 6px" }}>Contract-length optimiser</p>
      <table className="sr-table">
        <tbody>
          <tr style={{ color: C.faint }}>
            <td style={{ color: C.faint }}>Length</td><td style={{ textAlign: "right", color: C.faint }}>Annual amortisation</td><td style={{ textAlign: "right", color: C.faint }}>Total wage commitment</td>
          </tr>
          {rows.map((row) => (
            <tr key={row.years} style={row.years === 5 ? { background: C.claretGlow } : undefined}>
              <td>{row.years} yrs{row.atCap ? " *" : ""}</td>
              <td style={{ textAlign: "right", color: C.text }}>£{row.annualAmortM}m</td>
              <td style={{ textAlign: "right", color: C.text }}>£{row.totalWageCommitmentM}m</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ font: `400 11px ${FONT_B}`, color: C.faint, marginTop: 6, lineHeight: 1.5 }}>
        * Beyond 5 years the annual amortisation no longer falls — the SCR amortisation period is capped at {AMORTISATION_CAP_YEARS} years. A 5-year deal minimises the annual book cost while keeping resale value; longer terms only add wage liability.
      </p>

      {/* AI strategy */}
      <p style={{ font: `600 11px ${FONT_D}`, letterSpacing: 1.5, textTransform: "uppercase", color: C.faint, margin: "16px 0 6px" }}>Deal strategy</p>
      {editing ? (
        <textarea className="sr-input" style={{ width: "100%", minHeight: 96 }} value={dossier.financeCommentary} onChange={(e) => upd({ financeCommentary: e.target.value })} />
      ) : (
        <p style={{ font: `400 14px/1.6 ${FONT_B}`, color: C.text }}>{dossier.financeCommentary || "Regenerate this dossier to get an AI deal-strategy note tailored to your club's SCR position."}</p>
      )}
    </section>
  );
}

/* ------------------------------ small bits -------------------------------- */
const lblStyle: React.CSSProperties = { font: `500 10px ${FONT_D}`, letterSpacing: 1.2, textTransform: "uppercase", color: C.faint };
function Field({ label, value, on, text }: { label: string; value: any; on: (v: string) => void; text?: boolean }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={lblStyle}>{label}</span>
      <input className="sr-input" style={{ padding: "7px 9px", font: `500 13px ${FONT_M}` }} type={text ? "text" : "number"} step="0.1" value={value} onChange={(e) => on(e.target.value)} />
    </label>
  );
}
function Tile({ label, value, sub, accent = C.text }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{ background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px" }}>
      <div style={lblStyle}>{label}</div>
      <div style={{ font: `700 20px ${FONT_D}`, color: accent, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ font: `400 11px ${FONT_M}`, color: C.faint, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}
