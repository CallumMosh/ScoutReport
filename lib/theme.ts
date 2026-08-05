// Claret & blue "recruitment room" palette.
export const C = {
  bg: "#15121B", bg2: "#1C1824", card: "#221D2B", cardHi: "#2A2333",
  line: "#3A3244", lineSoft: "#2E2836",
  claret: "#A62E4E", claretDeep: "#6E1F33", claretGlow: "rgba(166,46,78,0.16)",
  blue: "#2FB3E8", blueDeep: "#1B7FB0", blueGlow: "rgba(47,179,232,0.14)",
  text: "#EDE7EE", muted: "#9A8FA5", faint: "#6C6377",
  good: "#3FB47F", warn: "#E0A33C",
};

export const FONT_D = "'Oswald', system-ui, sans-serif";
export const FONT_B = "'Inter', system-ui, sans-serif";
export const FONT_M = "'JetBrains Mono', ui-monospace, monospace";

export const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
export const num = (n: unknown) => (Number.isFinite(Number(n)) ? Number(n) : 0);
export const fitColor = (s: number) => (s >= 70 ? C.good : s >= 50 ? C.warn : C.claret);
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
