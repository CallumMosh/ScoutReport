"use client";
import React, { useEffect, useState } from "react";
import { C, FONT_D, FONT_M } from "@/lib/theme";

const KEY = "scout-room:model";
export function getSavedModel(): string {
  if (typeof window === "undefined") return "";
  try { return window.localStorage.getItem(KEY) || ""; } catch { return ""; }
}

export function ModelPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [models, setModels] = useState<{ id: string; label: string }[]>([]);
  const [err, setErr] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/models");
        const json = await res.json();
        if (json?.models?.length) setModels(json.models);
        else setErr(true);
      } catch { setErr(true); }
    })();
  }, []);

  if (err || models.length === 0) return null; // silently fall back to server default

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
      <span style={{ font: `500 10px ${FONT_D}`, letterSpacing: 1.5, textTransform: "uppercase", color: C.faint }}>Model</span>
      <select
        className="sr-input"
        style={{ padding: "6px 10px", font: `500 12px ${FONT_M}`, maxWidth: 260 }}
        value={value}
        onChange={(e) => { onChange(e.target.value); try { window.localStorage.setItem(KEY, e.target.value); } catch {} }}
      >
        <option value="">Server default</option>
        {models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
      </select>
    </div>
  );
}
