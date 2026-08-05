"use client";
import React from "react";
import { C, FONT_D, FONT_M } from "@/lib/theme";

export function Panel({ title, sub, accent = C.claret, children, style }: any) {
  return (
    <section style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, ...style }}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ width: 3, height: 15, background: accent, borderRadius: 2 }} />
          <h3 style={{ font: `600 13px ${FONT_D}`, letterSpacing: 1.8, textTransform: "uppercase", margin: 0 }}>{title}</h3>
          {sub && <span style={{ font: `400 11px ${FONT_M}`, color: C.faint }}>· {sub}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Tile({ label, value, sub, accent = C.text }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{ background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ font: `500 10px ${FONT_D}`, letterSpacing: 1.2, textTransform: "uppercase", color: C.faint }}>{label}</div>
      <div style={{ font: `700 22px ${FONT_D}`, color: accent, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ font: `400 11px ${FONT_M}`, color: C.faint, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

export const Label = ({ children }: any) => (
  <span style={{ font: `500 10px ${FONT_D}`, letterSpacing: 1.4, textTransform: "uppercase", color: C.faint }}>{children}</span>
);

export function MiniBar({ value, color = C.blue, height = 7 }: { value: number; color?: string; height?: number }) {
  return (
    <div style={{ flex: 1, height, background: C.lineSoft, borderRadius: 4, overflow: "hidden" }}>
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: "100%", background: color, borderRadius: 4, transition: "width .5s" }} />
    </div>
  );
}

export function needColor(v: number) { return v >= 65 ? C.claret : v >= 40 ? C.warn : C.good; }
