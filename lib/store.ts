import { supabase, hasSupabase } from "./supabase";
import { Dossier } from "./types";

const LS_KEY = "scout-room:dossiers";

/** True when saves go to Supabase; false means localStorage-only. */
export const storageMode = (): "supabase" | "local" => (hasSupabase ? "supabase" : "local");

/* ------------------------------ localStorage ------------------------------ */
function lsLoad(): Dossier[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Dossier[]) : [];
  } catch { return []; }
}
function lsWrite(list: Dossier[]) {
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
}

/* -------------------------------- public API ------------------------------ */
export async function loadAll(): Promise<Dossier[]> {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from("dossiers")
      .select("id, data, saved_at")
      .order("saved_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({ ...(row.data as Dossier), id: row.id, savedAt: row.saved_at }));
  }
  return lsLoad().sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}

export async function saveDossier(d: Dossier): Promise<Dossier> {
  const saved: Dossier = { ...d, savedAt: Date.now() };
  if (hasSupabase && supabase) {
    const { error } = await supabase.from("dossiers").upsert({
      id: saved.id,
      name: saved.name,
      data: saved,
      saved_at: saved.savedAt,
    });
    if (error) throw error;
  } else {
    const list = lsLoad().filter((x) => x.id !== saved.id);
    lsWrite([saved, ...list]);
  }
  return saved;
}

export async function deleteDossier(id: string): Promise<void> {
  if (hasSupabase && supabase) {
    const { error } = await supabase.from("dossiers").delete().eq("id", id);
    if (error) throw error;
  } else {
    lsWrite(lsLoad().filter((x) => x.id !== id));
  }
}
