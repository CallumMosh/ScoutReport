"use client";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { C, FONT_D, FONT_M, fitColor } from "@/lib/theme";

const tt = (extra: any = {}) => ({
  contentStyle: { background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 8, fontFamily: FONT_M, fontSize: 12, color: C.text },
  labelStyle: { color: C.muted },
  ...extra,
});

export function AttributeRadar({ data }: { data: { attribute: string; value: number }[] }) {
  return (
    <div style={{ height: 330 }}>
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke={C.line} />
          <PolarAngleAxis dataKey="attribute" tick={{ fill: C.muted, fontSize: 11, fontFamily: FONT_M }} />
          <Radar dataKey="value" stroke={C.claret} fill={C.claret} fillOpacity={0.32} strokeWidth={2} />
          <Tooltip {...tt()} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CompareRadar({ data, nameA, nameB }: { data: any[]; nameA: string; nameB: string }) {
  return (
    <div style={{ height: 380 }}>
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="74%">
          <PolarGrid stroke={C.line} />
          <PolarAngleAxis dataKey="attribute" tick={{ fill: C.muted, fontSize: 11, fontFamily: FONT_M }} />
          <Radar name={nameA} dataKey="A" stroke={C.claret} fill={C.claret} fillOpacity={0.28} strokeWidth={2} />
          <Radar name={nameB} dataKey="B" stroke={C.blue} fill={C.blue} fillOpacity={0.22} strokeWidth={2} />
          <Tooltip {...tt()} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Per90Bars({ data }: { data: { metric: string; value: number }[] }) {
  return (
    <div style={{ height: 210 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.lineSoft} vertical={false} />
          <XAxis dataKey="metric" tick={{ fill: C.muted, fontSize: 11, fontFamily: FONT_M }} axisLine={{ stroke: C.line }} tickLine={false} />
          <YAxis tick={{ fill: C.faint, fontSize: 10, fontFamily: FONT_M }} axisLine={false} tickLine={false} />
          <Tooltip {...tt({ cursor: { fill: C.claretGlow } })} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={i % 2 ? C.blue : C.claret} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Per90CompareBars({ data }: { data: any[] }) {
  return (
    <div style={{ height: 180 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.lineSoft} vertical={false} />
          <XAxis dataKey="metric" tick={{ fill: C.muted, fontSize: 10, fontFamily: FONT_M }} axisLine={{ stroke: C.line }} tickLine={false} />
          <YAxis tick={{ fill: C.faint, fontSize: 10, fontFamily: FONT_M }} axisLine={false} tickLine={false} />
          <Tooltip {...tt({ cursor: { fill: C.claretGlow } })} />
          <Bar dataKey="A" fill={C.claret} radius={[3, 3, 0, 0]} />
          <Bar dataKey="B" fill={C.blue} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FitGauge({ score, size = 176 }: { score: number; size?: number }) {
  const r = 74, cx = size / 2, cy = size / 2;
  const path = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const len = Math.PI * r;
  const col = fitColor(score);
  return (
    <svg width={size} height={size * 0.66} viewBox={`0 0 ${size} ${size * 0.62}`}>
      <path d={path} fill="none" stroke={C.lineSoft} strokeWidth="12" strokeLinecap="round" />
      <path d={path} fill="none" stroke={col} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={len} strokeDashoffset={len * (1 - score / 100)}
        style={{ transition: "stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)" }} />
      <text x={cx} y={cy - 6} textAnchor="middle" style={{ font: `700 40px ${FONT_D}`, fill: C.text }}>{score}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" style={{ font: `500 11px ${FONT_M}`, fill: C.muted, letterSpacing: 1 }}>/ 100</text>
    </svg>
  );
}

export function ScoreBar({ label, value, color = C.blue }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "7px 0" }}>
      <span style={{ width: 92, font: `500 11px ${FONT_M}`, color: C.muted }}>{label}</span>
      <div style={{ flex: 1, height: 7, background: C.lineSoft, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 4, transition: "width .6s" }} />
      </div>
      <span style={{ width: 26, textAlign: "right", font: `500 12px ${FONT_M}`, color: C.text }}>{value}</span>
    </div>
  );
}
