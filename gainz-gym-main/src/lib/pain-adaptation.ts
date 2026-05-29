import {
  EXERCISE_DB,
  suggestWeight,
  type Equipment,
  type Exercise,
  type ExerciseDef,
  type OnboardingAnswers,
  type Workout,
} from "./forge-routines";
import type { AdaptationBadgeId } from "./design-tokens";

export type PainArea = { body_part: string; severity: number; notes?: string };

export type AdaptationResult = {
  exercises: Exercise[];
  reasoning: string;
  badges: AdaptationBadgeId[];
  userMessage: string;
  changed: boolean;
};

/** Exercises that stress each body part (min severity to trigger swap) */
const EXERCISE_PAIN_MAP: Record<string, { parts: string[]; minSeverity: number }> = {
  deadlift: { parts: ["lumbar", "cervical"], minSeverity: 2 },
  rdl: { parts: ["lumbar", "isquios"], minSeverity: 2 },
  barbell_row: { parts: ["lumbar"], minSeverity: 2 },
  squat: { parts: ["rodilla", "lumbar", "cuádriceps"], minSeverity: 2 },
  bulgarian: { parts: ["rodilla", "cadera"], minSeverity: 2 },
  lunge: { parts: ["rodilla", "tobillo"], minSeverity: 2 },
  leg_press: { parts: ["rodilla", "lumbar"], minSeverity: 3 },
  bw_squat: { parts: ["rodilla"], minSeverity: 3 },
  goblet: { parts: ["rodilla", "lumbar"], minSeverity: 4 },
  ohp: { parts: ["hombro", "lumbar", "cervical"], minSeverity: 2 },
  db_ohp: { parts: ["hombro", "cervical"], minSeverity: 2 },
  dips: { parts: ["hombro", "pecho"], minSeverity: 2 },
  pike_pu: { parts: ["hombro", "cervical"], minSeverity: 2 },
  pullup: { parts: ["hombro", "codo"], minSeverity: 3 },
  chin_up: { parts: ["hombro", "codo"], minSeverity: 3 },
  bench: { parts: ["hombro"], minSeverity: 4 },
  incline_db: { parts: ["hombro"], minSeverity: 4 },
  hanging_leg: { parts: ["lumbar", "abdomen"], minSeverity: 2 },
  russian: { parts: ["lumbar"], minSeverity: 3 },
  calf_raise: { parts: ["gemelos", "tobillo", "pie"], minSeverity: 3 },
};

/** Safe replacements per body part conflict */
const REPLACEMENTS: Record<string, Partial<Record<string, string[]>>> = {
  deadlift: {
    lumbar: ["hip_thrust", "glute_bridge", "lat_pull"],
    cervical: ["lat_pull", "db_row"],
  },
  rdl: { lumbar: ["leg_curl", "glute_bridge"], isquios: ["leg_curl", "glute_bridge"] },
  barbell_row: { lumbar: ["db_row", "lat_pull", "inv_row"] },
  squat: {
    rodilla: ["leg_press", "goblet", "glute_bridge"],
    lumbar: ["leg_press", "goblet"],
    cuádriceps: ["leg_press", "goblet"],
  },
  bulgarian: { rodilla: ["goblet", "glute_bridge", "leg_curl"], cadera: ["glute_bridge", "leg_curl"] },
  lunge: { rodilla: ["glute_bridge", "leg_curl", "goblet"], tobillo: ["glute_bridge", "leg_curl"] },
  leg_press: { rodilla: ["goblet", "glute_bridge"], lumbar: ["glute_bridge", "leg_curl"] },
  bw_squat: { rodilla: ["glute_bridge", "leg_curl"] },
  goblet: { rodilla: ["glute_bridge", "leg_curl"], lumbar: ["glute_bridge"] },
  ohp: { hombro: ["face_pull", "lat_raise"], lumbar: ["face_pull"], cervical: ["face_pull", "lat_raise"] },
  db_ohp: { hombro: ["lat_raise", "face_pull"], cervical: ["face_pull"] },
  dips: { hombro: ["pushup", "db_bench"], pecho: ["pushup", "db_bench"] },
  pike_pu: { hombro: ["lat_raise", "face_pull"], cervical: ["face_pull"] },
  pullup: { hombro: ["lat_pull", "inv_row"], codo: ["lat_pull", "db_row"] },
  chin_up: { hombro: ["lat_pull", "db_curl"], codo: ["lat_pull", "db_curl"] },
  bench: { hombro: ["db_bench", "pushup"] },
  incline_db: { hombro: ["db_bench", "fly_db"] },
  hanging_leg: { lumbar: ["plank", "ab_wheel"], abdomen: ["plank"] },
  russian: { lumbar: ["plank", "ab_wheel"] },
  calf_raise: { gemelos: ["plank"], tobillo: ["glute_bridge"], pie: ["glute_bridge"] },
};

const PART_MESSAGES: Record<string, string> = {
  lumbar: "Adaptamos tu rutina para reducir molestias lumbares.",
  rodilla: "Reducimos ejercicios de impacto para cuidar tu rodilla.",
  hombro: "Priorizamos movimientos seguros para tu hombro.",
  cervical: "Evitamos cargas axiales sobre el cuello.",
  cadera: "Ajustamos ejercicios para mayor estabilidad de cadera.",
  tobillo: "Priorizamos movimientos de bajo impacto en tobillo.",
  codo: "Reducimos estrés en articulación del codo.",
  isquios: "Adaptamos el trabajo de cadena posterior.",
  cuádriceps: "Modificamos el volumen de cuádriceps hoy.",
  gemelos: "Reducimos carga en gemelos.",
  pie: "Evitamos impacto excesivo en el pie.",
  abdomen: "Ajustamos core para menor compresión.",
  pecho: "Sustituimos movimientos que estresan el pecho.",
};

function getDef(id: string): ExerciseDef | undefined {
  return EXERCISE_DB.find((e) => e.id === id);
}

function pickReplacement(
  exerciseId: string,
  bodyPart: string,
  equipment: Equipment,
  usedIds: Set<string>
): ExerciseDef | null {
  const candidates = REPLACEMENTS[exerciseId]?.[bodyPart] ?? [];
  for (const id of candidates) {
    if (usedIds.has(id)) continue;
    const def = getDef(id);
    if (def && def.equipment.includes(equipment)) return def;
  }
  // Fallback: same muscle group, lower load, not compound if possible
  const orig = getDef(exerciseId);
  if (!orig) return null;
  const fallback = EXERCISE_DB.find(
    (e) =>
      e.group === orig.group &&
      e.equipment.includes(equipment) &&
      !usedIds.has(e.id) &&
      (e.loadCoef ?? 0) < (orig.loadCoef ?? 1) &&
      !EXERCISE_PAIN_MAP[e.id]
  );
  return fallback ?? null;
}

function shouldSwap(exerciseId: string, painAreas: PainArea[]): { swap: boolean; part?: string; severity: number } {
  const risk = EXERCISE_PAIN_MAP[exerciseId];
  if (!risk) return { swap: false, severity: 0 };
  for (const p of painAreas) {
    if (risk.parts.includes(p.body_part) && p.severity >= risk.minSeverity) {
      return { swap: true, part: p.body_part, severity: p.severity };
    }
  }
  return { swap: false, severity: 0 };
}

function reduceIntensity(ex: Exercise, severity: number): Exercise {
  const factor = severity >= 4 ? 0.7 : severity >= 3 ? 0.85 : 0.92;
  const newSets = Math.max(2, Math.round(ex.sets * factor));
  return {
    ...ex,
    sets: newSets,
    weightKg: ex.weightKg ? Math.round(ex.weightKg * factor * 2) / 2 : undefined,
    rest: Math.min(ex.rest + 15, ex.rest + 30),
    tips: [
      ...ex.tips.slice(0, 2),
      "Carga reducida por adaptación a molestia reportada. Priorizá técnica y control.",
    ],
  };
}

function buildExerciseFromDef(def: ExerciseDef, template: Exercise, profile: Pick<OnboardingAnswers, "level" | "weight">): Exercise {
  const weight = suggestWeight(def, profile.weight, profile.level);
  return {
    id: def.id,
    name: def.name,
    group: def.group,
    sets: template.sets,
    reps: template.reps,
    rest: template.rest,
    xp: template.xp,
    weightKg: weight,
    tips: [...def.tips, "Variante segura sugerida por adaptación inteligente."],
    videoUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(def.videoQuery)}`,
    isCompound: def.isCompound,
  };
}

export function adaptWorkoutForPain(
  workout: Workout,
  painAreas: PainArea[],
  profile: Pick<OnboardingAnswers, "level" | "weight" | "equipment">
): AdaptationResult | null {
  if (!painAreas.length) return null;

  const usedIds = new Set<string>();
  const affectedParts = new Set<string>();
  let hadSwap = false;
  let hadReduce = false;
  const swapNotes: string[] = [];

  const maxSeverity = Math.max(...painAreas.map((p) => p.severity));

  const adapted = workout.exercises.map((ex) => {
    usedIds.add(ex.id);
    const { swap, part, severity } = shouldSwap(ex.id, painAreas);
    if (!swap || !part) {
      // mild reduction for nearby muscle stress at high severity
      if (maxSeverity >= 4 && ex.isCompound && ex.weightKg) {
        hadReduce = true;
        return reduceIntensity(ex, maxSeverity);
      }
      return ex;
    }

    affectedParts.add(part);
    const replacement = pickReplacement(ex.id, part, profile.equipment, usedIds);
    if (replacement) {
      hadSwap = true;
      usedIds.add(replacement.id);
      swapNotes.push(`${ex.name} → ${replacement.name}`);
      return buildExerciseFromDef(replacement, ex, profile);
    }

    hadReduce = true;
    return reduceIntensity(ex, severity);
  });

  if (!hadSwap && !hadReduce) return null;

  const parts = Array.from(affectedParts);
  const primaryPart = parts[0] ?? painAreas.sort((a, b) => b.severity - a.severity)[0]?.body_part;
  const userMessage = primaryPart
    ? PART_MESSAGES[primaryPart] ?? "Adaptamos tu rutina según tus molestias de hoy."
    : "Adaptamos tu rutina según tus molestias de hoy.";

  const badges: AdaptationBadgeId[] = ["adaptado"];
  if (parts.includes("rodilla") || painAreas.some((p) => p.body_part === "rodilla")) badges.push("seguro-rodilla");
  if (parts.includes("hombro") || painAreas.some((p) => p.body_part === "hombro")) badges.push("seguro-hombro");
  if (parts.includes("lumbar") || painAreas.some((p) => p.body_part === "lumbar")) badges.push("seguro-lumbar");
  if (hadReduce) badges.push("baja-carga");
  if (maxSeverity >= 4) badges.push("recuperacion");
  if (hadSwap && !hadReduce) badges.push("movilidad");

  const reasoning =
    swapNotes.length > 0
      ? `${userMessage} Cambios: ${swapNotes.join("; ")}. Mantenemos el objetivo del entrenamiento con variantes más seguras según biomecánica y prevención de lesiones. No reemplaza evaluación médica.`
      : `${userMessage} Reducimos series e intensidad para permitir entrenar con menor estrés articular. No reemplaza evaluación médica.`;

  return {
    exercises: adapted,
    reasoning,
    badges: [...new Set(badges)],
    userMessage,
    changed: true,
  };
}

/** Detect pain mentions in free text (chat) */
export function detectPainFromText(text: string): PainArea[] {
  const lower = text.toLowerCase();
  const parts = [
    "rodilla", "tobillo", "cadera", "lumbar", "espalda baja", "cervical", "cuello",
    "hombro", "codo", "muñeca", "pecho", "abdomen", "isquios", "cuádriceps", "gemelos", "pie",
  ];
  const found: PainArea[] = [];
  for (const part of parts) {
    const normalized = part === "espalda baja" ? "lumbar" : part === "cuello" ? "cervical" : part;
    if (lower.includes(part) || lower.includes(normalized)) {
      const severity = /fuerte|mucho|insoportable|severo|grave/.test(lower)
        ? 4
        : /leve|poco|algo/.test(lower)
          ? 2
          : 3;
      if (!found.some((f) => f.body_part === normalized)) {
        found.push({ body_part: normalized, severity });
      }
    }
  }
  return found;
}

export function mergePainAreas(...lists: PainArea[][]): PainArea[] {
  const map = new Map<string, PainArea>();
  for (const list of lists) {
    for (const p of list) {
      const cur = map.get(p.body_part);
      if (!cur || p.severity > cur.severity) map.set(p.body_part, p);
    }
  }
  return Array.from(map.values());
}
