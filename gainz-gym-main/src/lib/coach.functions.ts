import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  adaptWorkoutForPain,
  detectPainFromText,
  mergePainAreas,
  type PainArea,
} from "@/lib/pain-adaptation";
import type { AdaptationBadgeId } from "@/lib/design-tokens";
import type { Equipment, OnboardingAnswers, Workout } from "@/lib/forge-routines";

/* ============== TYPES (shared with client) ============== */

export type ExerciseLog = {
  id: string;
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  workout_id: string | null;
  workout_name: string | null;
  date: string;
  set_index: number;
  weight_kg: number | null;
  reps: number;
  is_pr: boolean;
  created_at: string;
};

export type CoachMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  created_at: string;
};

export type CoachProfile = {
  injuries: { body_part: string; severity?: string; notes?: string; added_at: string }[];
  preferences: { text: string; added_at: string }[];
  notes: string;
  updated_at: string;
};

export type DailyCheckin = {
  date: string;
  pain_areas: { body_part: string; severity: number; notes?: string }[];
  notes: string;
};

export type RoutineOverride = {
  date: string;
  workout_id: string;
  workout_name: string;
  focus: string;
  exercises: Array<{
    id: string;
    name: string;
    group: string;
    sets: number;
    reps: string;
    rest: number;
    weightKg?: number;
    tips: string[];
    videoUrl: string;
    isCompound: boolean;
    xp: number;
  }>;
  reasoning: string;
};

/* ============== EXERCISE LOGS ============== */

const SetInput = z.object({
  exercise_id: z.string().min(1).max(120),
  exercise_name: z.string().min(1).max(200),
  muscle_group: z.string().min(1).max(50),
  workout_id: z.string().max(120).nullable().optional(),
  workout_name: z.string().max(200).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  set_index: z.number().int().min(0).max(50),
  weight_kg: z.number().min(0).max(1000).nullable(),
  reps: z.number().int().min(0).max(500),
});

export const logExerciseSets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ sets: z.array(SetInput).min(1).max(500) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // For each (exercise_id), compute prior best to flag PRs
    const exerciseIds = Array.from(new Set(data.sets.map((s) => s.exercise_id)));
    const { data: prevBest } = await supabase
      .from("exercise_logs")
      .select("exercise_id, weight_kg")
      .eq("user_id", userId)
      .in("exercise_id", exerciseIds);
    const bestByEx = new Map<string, number>();
    for (const r of prevBest ?? []) {
      const w = Number(r.weight_kg ?? 0);
      if (w > (bestByEx.get(r.exercise_id) ?? -1)) bestByEx.set(r.exercise_id, w);
    }

    const rows = data.sets.map((s) => {
      const w = s.weight_kg ?? 0;
      const prev = bestByEx.get(s.exercise_id) ?? -1;
      const isPR = w > 0 && w > prev;
      if (isPR) bestByEx.set(s.exercise_id, w);
      return { ...s, user_id: userId, is_pr: isPR };
    });

    const { error } = await supabase.from("exercise_logs").insert(rows);
    if (error) throw new Error(error.message);
    return { inserted: rows.length };
  });

export const getProgressLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("exercise_logs")
      .select(
        "id, exercise_id, exercise_name, muscle_group, workout_id, workout_name, date, set_index, weight_kg, reps, is_pr, created_at"
      )
      .eq("user_id", userId)
      .order("date", { ascending: true })
      .limit(5000);
    if (error) throw new Error(error.message);
    return (data ?? []) as ExerciseLog[];
  });

/** Seed logs from local exerciseHistory (idempotent: skip exercise_ids already present) */
const SeedItem = z.object({
  exercise_id: z.string().min(1).max(120),
  exercise_name: z.string().min(1).max(200),
  muscle_group: z.string().min(1).max(50),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sets: z.array(
    z.object({
      weight_kg: z.number().min(0).max(1000).nullable(),
      reps: z.number().int().min(0).max(500),
    })
  ).max(50),
});

export const seedExerciseLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ items: z.array(SeedItem).max(500) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.items.length === 0) return { inserted: 0 };

    // Skip exercises already seeded
    const ids = Array.from(new Set(data.items.map((i) => i.exercise_id)));
    const { data: existing } = await supabase
      .from("exercise_logs")
      .select("exercise_id")
      .eq("user_id", userId)
      .in("exercise_id", ids);
    const seen = new Set((existing ?? []).map((r) => r.exercise_id));

    type SeedRow = {
      user_id: string;
      exercise_id: string;
      exercise_name: string;
      muscle_group: string;
      date: string;
      set_index: number;
      weight_kg: number | null;
      reps: number;
      is_pr: boolean;
    };
    const rows: SeedRow[] = [];
    for (const it of data.items) {
      if (seen.has(it.exercise_id)) continue;
      it.sets.forEach((s, idx) => {
        rows.push({
          user_id: userId,
          exercise_id: it.exercise_id,
          exercise_name: it.exercise_name,
          muscle_group: it.muscle_group,
          date: it.date,
          set_index: idx,
          weight_kg: s.weight_kg,
          reps: s.reps,
          is_pr: false,
        });
      });
    }
    if (rows.length === 0) return { inserted: 0 };
    const { error } = await supabase.from("exercise_logs").insert(rows);
    if (error) throw new Error(error.message);
    return { inserted: rows.length };
  });

/* ============== COACH PROFILE ============== */

async function loadProfile(supabase: any, userId: string): Promise<CoachProfile> {
  const { data } = await supabase
    .from("user_coach_profile")
    .select("injuries, preferences, notes, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) {
    return { injuries: [], preferences: [], notes: "", updated_at: new Date().toISOString() };
  }
  return data as CoachProfile;
}

export const getCoachProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return loadProfile(context.supabase, context.userId);
  });

export const updateCoachProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      injuries: z.array(z.object({
        body_part: z.string().min(1).max(60),
        severity: z.string().max(40).optional(),
        notes: z.string().max(500).optional(),
        added_at: z.string(),
      })).max(50).optional(),
      preferences: z.array(z.object({
        text: z.string().min(1).max(300),
        added_at: z.string(),
      })).max(50).optional(),
      notes: z.string().max(4000).optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const cur = await loadProfile(supabase, userId);
    const merged = {
      user_id: userId,
      injuries: data.injuries ?? cur.injuries,
      preferences: data.preferences ?? cur.preferences,
      notes: data.notes ?? cur.notes,
    };
    const { error } = await supabase.from("user_coach_profile").upsert(merged);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============== COACH MESSAGES ============== */

export const getCoachMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("coach_messages")
      .select("id, role, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as CoachMessage[];
  });

export const clearCoachMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("coach_messages").delete().eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============== DAILY CHECK-IN ============== */

export const getDailyCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("daily_checkins")
      .select("date, pain_areas, notes")
      .eq("user_id", userId)
      .eq("date", data.date)
      .maybeSingle();
    return (row ?? null) as DailyCheckin | null;
  });

export const saveDailyCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      pain_areas: z.array(z.object({
        body_part: z.string().min(1).max(60),
        severity: z.number().int().min(1).max(5),
        notes: z.string().max(300).optional(),
      })).max(20),
      notes: z.string().max(1000).default(""),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("daily_checkins").upsert({
      user_id: userId,
      date: data.date,
      pain_areas: data.pain_areas,
      notes: data.notes,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============== ROUTINE OVERRIDES ============== */

export const getRoutineOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      workout_id: z.string().min(1).max(120),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("routine_overrides")
      .select("date, workout_id, workout_name, focus, exercises, reasoning")
      .eq("user_id", userId)
      .eq("date", data.date)
      .eq("workout_id", data.workout_id)
      .maybeSingle();
    return (row ?? null) as RoutineOverride | null;
  });

export const clearRoutineOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      workout_id: z.string().min(1).max(120),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("routine_overrides")
      .delete()
      .eq("user_id", userId)
      .eq("date", data.date)
      .eq("workout_id", data.workout_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============== AUTO PAIN ADAPTATION ============== */

const WorkoutInput = z.object({
  id: z.string(),
  name: z.string(),
  focus: z.string(),
  exercises: z.array(z.object({
    id: z.string(),
    name: z.string(),
    group: z.string(),
    sets: z.number(),
    reps: z.string(),
    rest: z.number(),
    weightKg: z.number().optional(),
    tips: z.array(z.string()).optional(),
    videoUrl: z.string().optional(),
    isCompound: z.boolean().optional(),
    xp: z.number().optional(),
  })),
});

export const autoAdaptRoutineForPain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      workout: WorkoutInput,
      pain_areas: z.array(z.object({
        body_part: z.string().min(1).max(60),
        severity: z.number().int().min(1).max(5),
        notes: z.string().max(300).optional(),
      })).max(20),
      profile: z.object({
        level: z.enum(["beginner", "intermediate", "advanced"]),
        weight: z.number().min(30).max(300),
        equipment: z.enum(["none", "dumbbells", "full_gym"]),
      }),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.pain_areas.length === 0) {
      await supabase
        .from("routine_overrides")
        .delete()
        .eq("user_id", userId)
        .eq("date", data.date)
        .eq("workout_id", data.workout.id);
      return { adapted: false, badges: [] as AdaptationBadgeId[] };
    }

    const result = adaptWorkoutForPain(
      data.workout as Workout,
      data.pain_areas as PainArea[],
      data.profile as Pick<OnboardingAnswers, "level" | "weight" | "equipment">
    );

    if (!result) return { adapted: false, badges: [] as AdaptationBadgeId[] };

    const exercises = result.exercises.map((e) => ({
      id: e.id,
      name: e.name,
      group: e.group,
      sets: e.sets,
      reps: e.reps,
      rest: e.rest,
      weightKg: e.weightKg,
      tips: e.tips,
      videoUrl: e.videoUrl,
      isCompound: e.isCompound,
      xp: e.xp,
    }));

    await supabase.from("routine_overrides").upsert({
      user_id: userId,
      date: data.date,
      workout_id: data.workout.id,
      workout_name: `${data.workout.name} (Adaptada)`,
      focus: data.workout.focus,
      exercises,
      reasoning: result.reasoning,
    });

    return {
      adapted: true,
      badges: result.badges,
      message: result.userMessage,
      reasoning: result.reasoning,
    };
  });

/* ============== AI COACH CHAT ============== */

const SYSTEM_PROMPT = `Eres un coach de fitness basado EXCLUSIVAMENTE en ciencia del deporte, investigación de gimnasio y estudios revisados por pares.

Reglas absolutas:
- Responde SOLO en base a literatura científica de fisiología del ejercicio, hipertrofia, fuerza, nutrición deportiva, recuperación y prevención de lesiones. Cuando sea relevante, cita principios (ej.: "principio de sobrecarga progresiva", "volumen efectivo semanal MEV-MAV-MRV de Israetel", "hipertrofia mecánica/metabólica de Schoenfeld 2010", "RPE/RIR de Helms", "ACSM guidelines", "Cochrane Reviews", "Suchomel 2018 sobre fuerza", "Krieger 2010 series por grupo muscular").
- NO inventes estudios. Si no estás seguro, dilo y da el principio general.
- Toda recomendación debe estar justificada con evidencia y adaptada al perfil del usuario que se te entrega (objetivo, nivel, días, equipo, lesiones, preferencias, historial).
- Si detectas conflicto entre una molestia actual y un ejercicio programado hoy, sugerí alternativas seguras y explicá el porqué (biomecánica, carga axial, estrés articular). SIEMPRE usá apply_routine_override cuando el usuario reporte dolor que afecte la rutina de hoy.
- Adaptación por zona (ejemplos obligatorios):
  · Lumbar: evitar peso muerto pesado, compresión lumbar, impacto; priorizar hip thrust, puente glúteo, jalón, menor carga axial.
  · Rodilla: evitar saltos, sentadillas profundas pesadas, zancadas agresivas; priorizar prensa controlada, goblet, estabilidad.
  · Hombro: evitar press vertical pesado, fondos riesgosos; priorizar face pull, elevaciones laterales, variantes seguras.
- Tono tranquilizador, nunca alarmista. Aclarar que no reemplaza evaluación médica profesional.
- Idioma: español rioplatense neutro, claro y directo. Sin emojis excesivos.

Herramientas disponibles (usalas cuando corresponda, sin pedir permiso):
- record_preference: cuando el usuario expresa una preferencia ("prefiero bajo volumen", "no me gustan las dominadas", "entreno por la mañana").
- record_injury: cuando reporta un dolor/lesión persistente.
- apply_routine_override: cuando hay conflicto entre dolor reportado y rutina del día, generá la rutina adaptada y aplicala.
- open_diet_planner: cuando el usuario pide un plan alimenticio completo, menú semanal, dieta personalizada, macros detallados o nutrición estructurada. NO intentes generar la dieta en el chat — abrí el planificador dedicado.

La app tiene una sección "Dieta" con wizard que genera planes completos con IA (macros, comidas, lista de compras). Para preguntas generales de nutrición (proteína, timing, suplementos) respondé en el chat. Para un plan completo, usá open_diet_planner.

Formato: respuestas concisas (3-6 párrafos máximo), con bullets cuando ayude.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "record_preference",
      description: "Registra una preferencia del usuario para futuras recomendaciones.",
      parameters: {
        type: "object",
        properties: { text: { type: "string", description: "La preferencia, en una frase." } },
        required: ["text"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "record_injury",
      description: "Registra una lesión o molestia persistente del usuario.",
      parameters: {
        type: "object",
        properties: {
          body_part: { type: "string" },
          severity: { type: "string", description: "leve | moderada | severa" },
          notes: { type: "string" },
        },
        required: ["body_part"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "apply_routine_override",
      description:
        "Reemplaza la rutina del día de hoy (workout_id) con una lista adaptada de ejercicios. Usar SOLO cuando haya un conflicto claro entre dolor/lesión y la rutina original.",
      parameters: {
        type: "object",
        properties: {
          workout_id: { type: "string" },
          workout_name: { type: "string" },
          focus: { type: "string" },
          reasoning: { type: "string", description: "Explicación basada en ciencia." },
          exercises: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                group: { type: "string" },
                sets: { type: "number" },
                reps: { type: "string" },
                rest: { type: "number" },
                weightKg: { type: "number" },
                isCompound: { type: "boolean" },
              },
              required: ["id", "name", "group", "sets", "reps", "rest"],
            },
          },
        },
        required: ["workout_id", "workout_name", "focus", "reasoning", "exercises"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "open_diet_planner",
      description:
        "Abre el planificador de dieta personalizada cuando el usuario pide un plan alimenticio completo, menú, dieta semanal o nutrición estructurada con comidas y macros.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Breve motivo por el cual se abre el planificador." },
        },
        required: ["reason"],
        additionalProperties: false,
      },
    },
  },
];

type ChatInput = {
  message: string;
  context_snapshot: {
    name?: string;
    goal?: string;
    level?: string;
    daysPerWeek?: number;
    sessionLength?: number;
    equipment?: string;
    age?: number;
    weight?: number;
    todays_workout?: { id: string; name: string; focus: string; exercises: Array<{ id: string; name: string; group: string; sets: number; reps: string }> } | null;
    todays_pain?: Array<{ body_part: string; severity: number; notes?: string }>;
    recent_progress?: Array<{ exercise: string; date: string; weight_kg: number | null; reps: number }>;
  };
};

export const chatWithCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      message: z.string().min(1).max(4000),
      context_snapshot: z.any(),
    }).parse(input) as ChatInput
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no configurado");

    // Save user message
    await supabase.from("coach_messages").insert({
      user_id: userId,
      role: "user",
      content: data.message,
    });

    // Load history + profile in parallel
    const [histRes, profile] = await Promise.all([
      supabase
        .from("coach_messages")
        .select("role, content")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(40),
      loadProfile(supabase, userId),
    ]);

    const history = (histRes.data ?? []).filter((m: any) => m.role === "user" || m.role === "assistant");

    const ctx = data.context_snapshot ?? {};
    const profileBlock = `
## PERFIL DEL USUARIO
- Nombre: ${ctx.name ?? "desconocido"}
- Edad: ${ctx.age ?? "?"} · Peso: ${ctx.weight ?? "?"} kg
- Objetivo: ${ctx.goal ?? "?"} · Nivel: ${ctx.level ?? "?"}
- Días/semana: ${ctx.daysPerWeek ?? "?"} · Sesión: ${ctx.sessionLength ?? "?"} min · Equipo: ${ctx.equipment ?? "?"}

## LESIONES REGISTRADAS
${profile.injuries.length === 0 ? "ninguna" : profile.injuries.map((i) => `- ${i.body_part}${i.severity ? ` (${i.severity})` : ""}${i.notes ? `: ${i.notes}` : ""}`).join("\n")}

## PREFERENCIAS
${profile.preferences.length === 0 ? "ninguna" : profile.preferences.map((p) => `- ${p.text}`).join("\n")}

## NOTAS LIBRES DEL COACH
${profile.notes || "(vacío)"}

## DOLOR REPORTADO HOY
${(!ctx.todays_pain || ctx.todays_pain.length === 0) ? "ninguno" : ctx.todays_pain.map((p: any) => `- ${p.body_part} (intensidad ${p.severity}/5)${p.notes ? `: ${p.notes}` : ""}`).join("\n")}

## RUTINA DE HOY
${ctx.todays_workout
  ? `workout_id: ${ctx.todays_workout.id} — ${ctx.todays_workout.name} (${ctx.todays_workout.focus})\n` +
    ctx.todays_workout.exercises.map((e: any) => `- ${e.name} [grupo=${e.group}] ${e.sets}x${e.reps}`).join("\n")
  : "sin rutina hoy"}

## PROGRESO RECIENTE (últimos sets relevantes)
${(!ctx.recent_progress || ctx.recent_progress.length === 0) ? "sin datos" : ctx.recent_progress.slice(0, 20).map((r: any) => `- ${r.date} ${r.exercise}: ${r.weight_kg ?? "PC"}kg x ${r.reps}`).join("\n")}
`.trim();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: profileBlock },
      ...history.map((m: any) => ({ role: m.role, content: m.content })),
    ];

    type ToolCall = { id: string; type: string; function: { name: string; arguments: string } };
    let finalText = "";
    const toolActions: string[] = [];
    let badges: AdaptationBadgeId[] = [];
    let navigate_to: "diet" | undefined;

    // Auto-adapt before AI if pain in context + workout today
    const chatPain = mergePainAreas(
      (ctx.todays_pain ?? []) as PainArea[],
      detectPainFromText(data.message)
    );
    if (chatPain.length > 0 && ctx.todays_workout && ctx.level && ctx.weight && ctx.equipment) {
      const autoResult = adaptWorkoutForPain(
        ctx.todays_workout as Workout,
        chatPain,
        {
          level: ctx.level as OnboardingAnswers["level"],
          weight: ctx.weight,
          equipment: ctx.equipment as Equipment,
        }
      );
      if (autoResult) {
        const today = new Date().toISOString().slice(0, 10);
        const exercises = autoResult.exercises.map((e) => ({
          id: e.id,
          name: e.name,
          group: e.group,
          sets: e.sets,
          reps: e.reps,
          rest: e.rest,
          weightKg: e.weightKg,
          tips: e.tips,
          videoUrl: e.videoUrl,
          isCompound: e.isCompound,
          xp: e.xp,
        }));
        await supabase.from("routine_overrides").upsert({
          user_id: userId,
          date: today,
          workout_id: ctx.todays_workout.id,
          workout_name: `${ctx.todays_workout.name} (Adaptada)`,
          focus: ctx.todays_workout.focus,
          exercises,
          reasoning: autoResult.reasoning,
        });
        toolActions.push(autoResult.userMessage);
        badges = autoResult.badges;
      }
    }

    for (let iter = 0; iter < 3; iter++) {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages,
          tools: TOOLS,
        }),
      });

      if (resp.status === 429) {
        return { reply: "El coach está saturado de pedidos. Probá en unos segundos.", actions: toolActions, badges, navigate_to, rate_limited: true };
      }
      if (resp.status === 402) {
        return { reply: "Se acabaron los créditos de IA del workspace. Recargá créditos para seguir usando el coach.", actions: toolActions, badges, navigate_to, payment_required: true };
      }
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`AI gateway error ${resp.status}: ${t}`);
      }

      const json = await resp.json();
      const msg = json.choices?.[0]?.message;
      if (!msg) break;

      const toolCalls: ToolCall[] | undefined = msg.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        // append assistant turn with tool_calls
          messages.push(msg);
        for (const tc of toolCalls) {
          const args = safeJSON(tc.function.arguments);
          let result = "ok";
          try {
            if (tc.function.name === "record_preference" && typeof args?.text === "string") {
              const next = [
                ...profile.preferences,
                { text: String(args.text).slice(0, 300), added_at: new Date().toISOString() },
              ];
              profile.preferences = next;
              await supabase.from("user_coach_profile").upsert({
                user_id: userId,
                injuries: profile.injuries,
                preferences: next,
                notes: profile.notes,
              });
              toolActions.push(`Preferencia registrada: "${args.text}"`);
            } else if (tc.function.name === "record_injury" && typeof args?.body_part === "string") {
              const next = [
                ...profile.injuries,
                {
                  body_part: String(args.body_part).slice(0, 60),
                  severity: args.severity ? String(args.severity).slice(0, 40) : undefined,
                  notes: args.notes ? String(args.notes).slice(0, 500) : undefined,
                  added_at: new Date().toISOString(),
                },
              ];
              profile.injuries = next;
              await supabase.from("user_coach_profile").upsert({
                user_id: userId,
                injuries: next,
                preferences: profile.preferences,
                notes: profile.notes,
              });
              toolActions.push(`Lesión registrada: ${args.body_part}`);
            } else if (tc.function.name === "apply_routine_override" && args?.workout_id && Array.isArray(args.exercises)) {
              const today = new Date().toISOString().slice(0, 10);
              const exercises = (args.exercises as any[]).map((e) => ({
                id: String(e.id ?? `alt_${Math.random().toString(36).slice(2, 8)}`),
                name: String(e.name ?? "Ejercicio"),
                group: String(e.group ?? "full"),
                sets: Number(e.sets ?? 3),
                reps: String(e.reps ?? "8-12"),
                rest: Number(e.rest ?? 90),
                weightKg: typeof e.weightKg === "number" ? e.weightKg : undefined,
                tips: ["Sustitución sugerida por el coach IA basada en tu molestia actual."],
                videoUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(String(e.name ?? "") + " técnica")}`,
                isCompound: Boolean(e.isCompound ?? false),
                xp: Number(e.sets ?? 3) * 10,
              }));
              await supabase.from("routine_overrides").upsert({
                user_id: userId,
                date: today,
                workout_id: String(args.workout_id),
                workout_name: String(args.workout_name ?? "Rutina adaptada"),
                focus: String(args.focus ?? "ADAPTADO"),
                exercises,
                reasoning: String(args.reasoning ?? ""),
              });
              toolActions.push(`Rutina del día adaptada (${exercises.length} ejercicios)`);
              badges = ["adaptado", "baja-carga"];
              const reasoning = String(args.reasoning ?? "").toLowerCase();
              if (reasoning.includes("rodilla")) badges.push("seguro-rodilla");
              if (reasoning.includes("hombro")) badges.push("seguro-hombro");
              if (reasoning.includes("lumbar") || reasoning.includes("espalda")) badges.push("seguro-lumbar");
              badges = [...new Set(badges)];
            } else if (tc.function.name === "open_diet_planner") {
              navigate_to = "diet";
              toolActions.push("Planificador de dieta listo");
            }
          } catch (e: any) {
            result = `error: ${e?.message ?? "tool failed"}`;
          }
          messages.push({ role: "tool", content: result, tool_call_id: tc.id });
        }
        // loop again so model can produce final text
        continue;
      }

      finalText = (msg.content ?? "").toString();
      break;
    }

    if (!finalText) finalText = "Listo, apliqué los cambios.";

    await supabase.from("coach_messages").insert({
      user_id: userId,
      role: "assistant",
      content: finalText,
    });

    return { reply: finalText, actions: toolActions, badges, navigate_to };
  });

function safeJSON(s: string): any {
  try { return JSON.parse(s); } catch { return {}; }
}