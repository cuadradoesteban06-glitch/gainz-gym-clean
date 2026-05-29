import { useEffect, useState } from "react";
import type { OnboardingAnswers, Workout } from "./forge-routines";
import { supabase } from "@/integrations/supabase/client";

export type HistoryEntry = {
  date: string;
  workoutName: string;
  focus: string;
  exercisesDone: number;
  totalExercises: number;
  xpGained: number;
  durationSec: number;
};

export type SetLog = { weight: number | null; reps: number; done: boolean };
export type LastSession = { sets: SetLog[]; date: string };

export type CustomExercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string;     // texto libre: "20kg", "PC", etc
  rest: number;       // segundos
};

export type CustomRoutine = {
  id: string;
  name: string;
  days: number;
  notes: string;
  exercises: CustomExercise[];
  createdAt: string;  // ISO datetime
  updatedAt: string;
};

export type ForgeState = {
  onboarded: boolean;
  answers: OnboardingAnswers | null;
  routine: Workout[];
  xp: number;
  streak: number;
  lastWorkoutDate: string | null;
  workouts: number;
  totalExercises: number;
  history: HistoryEntry[];
  achievements: string[];
  // último log por exercise id → para precargar peso/reps la próxima vez
  exerciseHistory: Record<string, LastSession>;
  // Foto de perfil (data URL JPEG comprimida)
  photo: string | null;
  // Rutinas creadas por el usuario
  customRoutines: CustomRoutine[];
};

const KEY = "forge_state_v1";

const DEFAULT: ForgeState = {
  onboarded: false,
  answers: null,
  routine: [],
  xp: 0,
  streak: 0,
  lastWorkoutDate: null,
  workouts: 0,
  totalExercises: 0,
  history: [],
  achievements: [],
  exerciseHistory: {},
  photo: null,
  customRoutines: [],
};

function load(): ForgeState {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT;
  }
}

function save(s: ForgeState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

let memState: ForgeState | null = null;
const listeners = new Set<() => void>();

/* ============ CLOUD SYNC ============ */
let currentUserId: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let suppressPush = false;

async function pushToCloud(uid: string, s: ForgeState) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from("forge_states").upsert({ user_id: uid, state: s as any });
  } catch (e) {
    console.error("[forge] push error", e);
  }
}

function schedulePush() {
  if (!currentUserId || suppressPush) return;
  if (pushTimer) clearTimeout(pushTimer);
  const uid = currentUserId;
  pushTimer = setTimeout(() => {
    pushTimer = null;
    pushToCloud(uid, getState());
  }, 700);
}

/** Called after auth: pull cloud state, or push local as initial if cloud empty (signup migration). */
export async function bindUserSync(
  userId: string,
  opts: { migrateLocalIfCloudEmpty: boolean }
): Promise<void> {
  currentUserId = userId;
  suppressPush = true;
  try {
    const { data, error } = await supabase
      .from("forge_states")
      .select("state")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;

    const cloud = data?.state as Partial<ForgeState> | null | undefined;
    const hasCloud = cloud && typeof cloud === "object" && Object.keys(cloud).length > 0;

    if (hasCloud) {
      memState = { ...DEFAULT, ...cloud };
      save(memState);
      listeners.forEach((l) => l());
    } else if (opts.migrateLocalIfCloudEmpty) {
      await pushToCloud(userId, getState());
    } else {
      // No cloud, no migration → start clean for this user
      memState = { ...DEFAULT };
      save(memState);
      listeners.forEach((l) => l());
    }
  } catch (e) {
    console.error("[forge] bindUserSync error", e);
  } finally {
    suppressPush = false;
  }
}

export function unbindUserSync() {
  currentUserId = null;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
}

export function clearAllLocal() {
  memState = { ...DEFAULT };
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}

export function isLoggedIn(): boolean {
  return currentUserId !== null;
}

export function getState(): ForgeState {
  if (!memState) memState = load();
  return memState;
}

export function setState(updater: (s: ForgeState) => ForgeState) {
  memState = updater(getState());
  save(memState);
  listeners.forEach((l) => l());
  schedulePush();
}

export function useForge() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return getState();
}

export function resetAll() {
  memState = { ...DEFAULT };
  save(memState);
  listeners.forEach((l) => l());
  schedulePush();
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string) {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.round((db - da) / 86400000);
}