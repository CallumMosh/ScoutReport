"use client";
import { useState, useEffect } from "react";
import {
  SquadPlayer, Slot, loadSquad, saveSquad, loadShortlist, saveShortlist, loadNeeds, saveNeeds,
} from "@/lib/squad";

export function useSquad(): [SquadPlayer[], (s: SquadPlayer[]) => void] {
  const [squad, setSquad] = useState<SquadPlayer[]>([]);
  useEffect(() => { setSquad(loadSquad()); }, []);
  const update = (s: SquadPlayer[]) => { setSquad(s); saveSquad(s); };
  return [squad, update];
}

export function useShortlist(): [string[], (ids: string[]) => void] {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => { setIds(loadShortlist()); }, []);
  const update = (v: string[]) => { setIds(v); saveShortlist(v); };
  return [ids, update];
}

export function useNeeds(): [Partial<Record<Slot, number>>, (n: Partial<Record<Slot, number>>) => void] {
  const [overrides, setOverrides] = useState<Partial<Record<Slot, number>>>({});
  useEffect(() => { setOverrides(loadNeeds()); }, []);
  const update = (n: Partial<Record<Slot, number>>) => { setOverrides(n); saveNeeds(n); };
  return [overrides, update];
}
