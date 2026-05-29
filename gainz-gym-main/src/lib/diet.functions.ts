import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* ============== TYPES ============== */

export type DietMealItem = { food: string; quantity: string; notes?: string };

export type DietMeal = {
  name: string;
  time?: string;
  items: DietMealItem[];
};

export type DietReplacement = {
  missing: string;
  substitute: string;
  explanation: string;
  applied_at?: string;
};

export type DietPlan = {
  id: string;
  title: string;
  goal: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  restrictions: string[];
  meals: DietMeal[];
  replacements: DietReplacement[];
  reasoning: string;
  shopping_list: string[];
  profile_snapshot: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DietGenerateInput = {
  goal: "fat_loss" | "muscle_gain" | "maintain" | "performance" | "recomposition";
  age: number;
  sex: "male" | "female" | "other";
  weight_kg: number;
  height_cm: number;
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
  training_frequency: number;
  restrictions: string[];
  allergies: string;
  other_restrictions: string;
  favorite_foods: string;
  disliked_foods: string;
  meals_per_day: number;
  budget: "low" | "medium" | "high";
  name?: string;
  training_goal?: string;
  training_days?: number;
};

const DietGenerateSchema = z.object({
  goal: z.enum(["fat_loss", "muscle_gain", "maintain", "performance", "recomposition"]),
  age: z.number().int().min(14).max(100),
  sex: z.enum(["male", "female", "other"]),
  weight_kg: z.number().min(30).max(300),
  height_cm: z.number().min(120).max(230),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  training_frequency: z.number().int().min(0).max(7),
  restrictions: z.array(z.string().max(60)).max(20),
  allergies: z.string().max(500).default(""),
  other_restrictions: z.string().max(500).default(""),
  favorite_foods: z.string().max(500).default(""),
  disliked_foods: z.string().max(500).default(""),
  meals_per_day: z.number().int().min(3).max(6),
  budget: z.enum(["low", "medium", "high"]),
  name: z.string().max(100).optional(),
  training_goal: z.string().max(100).optional(),
  training_days: z.number().int().optional(),
});

const DIET_SYSTEM_PROMPT = `Eres un nutricionista deportivo basado EXCLUSIVAMENTE en evidencia científica (ACSM, ISSN, AND, Cochrane, meta-análisis de proteína 1.6-2.2g/kg para hipertrofia, recomendaciones OMS/FAO).

Reglas absolutas:
- Respondé SOLO con JSON válido (sin markdown, sin texto extra).
- Cantidades EXACTAS en gramos, unidades o medidas caseras claras.
- Adaptá calorías y macros al objetivo, peso, altura, sexo, actividad y entrenamiento.
- Respetá TODAS las restricciones, alergias y condiciones (celíaco, diabético, vegano, etc.). Nunca incluyas alimentos prohibidos.
- Evitá dietas extremas (<1200 kcal mujeres / <1500 hombres salvo supervisión — no recomendar).
- Incluí horarios sugeridos por comida.
- Explicá brevemente el enfoque en "reasoning" citando principios (ej. déficit 300-500 kcal, proteína 1.8g/kg, distribución de CHO peri-entreno).
- Idioma: español rioplatense, claro y profesional.
- NO inventes papers. Si citás, usá principios generales reconocidos.

Formato JSON obligatorio:
{
  "title": "string",
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "reasoning": "string",
  "meals": [
    { "name": "Desayuno", "time": "08:00", "items": [{ "food": "avena", "quantity": "80g", "notes": "opcional" }] }
  ],
  "shopping_list": ["item1", "item2"]
}`;

const REPLACE_SYSTEM_PROMPT = `Eres nutricionista deportivo. El usuario no tiene ciertos ingredientes. Reemplazá manteniendo macros y calorías similares.

Respondé SOLO JSON:
{
  "meals": [ ... mismo formato con items actualizados ... ],
  "replacements": [
    { "missing": "arroz", "substitute": "quinoa 150g", "explanation": "por qué es equivalente" }
  ],
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number
}`;

function mapRow(row: Record<string, unknown>): DietPlan {
  return {
    id: String(row.id),
    title: String(row.title ?? "Plan nutricional"),
    goal: String(row.goal ?? ""),
    calories: Number(row.calories ?? 0),
    protein_g: Number(row.protein_g ?? 0),
    carbs_g: Number(row.carbs_g ?? 0),
    fat_g: Number(row.fat_g ?? 0),
    restrictions: (row.restrictions as string[]) ?? [],
    meals: (row.meals as DietMeal[]) ?? [],
    replacements: (row.replacements as DietReplacement[]) ?? [],
    reasoning: String(row.reasoning ?? ""),
    shopping_list: (row.shopping_list as string[]) ?? [],
    profile_snapshot: (row.profile_snapshot as Record<string, unknown>) ?? {},
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

async function callDietAI(system: string, userContent: string): Promise<string> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no configurado");

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (resp.status === 429) throw new Error("El coach está saturado. Probá en unos segundos.");
  if (resp.status === 402) throw new Error("Se acabaron los créditos de IA.");
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI error ${resp.status}: ${t}`);
  }

  const json = await resp.json();
  return (json.choices?.[0]?.message?.content ?? "").toString();
}

function parseAIJson<T>(raw: string): T {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned) as T;
}

function buildProfileBlock(input: DietGenerateInput): string {
  const goalLabels: Record<string, string> = {
    fat_loss: "Bajar grasa",
    muscle_gain: "Ganar masa muscular",
    maintain: "Mantener peso",
    performance: "Mejorar rendimiento",
    recomposition: "Recomposición corporal",
  };
  return `
Generá un plan alimenticio completo para:

OBJETIVO NUTRICIONAL: ${goalLabels[input.goal] ?? input.goal}
DATOS FÍSICOS:
- Nombre: ${input.name ?? "usuario"}
- Edad: ${input.age} · Sexo: ${input.sex}
- Peso: ${input.weight_kg} kg · Altura: ${input.height_cm} cm
- Actividad: ${input.activity_level}
- Entrenamiento: ${input.training_frequency} días/semana
- Objetivo entrenamiento (app): ${input.training_goal ?? "no especificado"}

RESTRICCIONES ALIMENTICIAS: ${input.restrictions.length ? input.restrictions.join(", ") : "ninguna declarada"}
ALERGIAS: ${input.allergies || "ninguna"}
OTRAS RESTRICCIONES/CONDICIONES: ${input.other_restrictions || "ninguna"}

PREFERENCIAS:
- Comidas favoritas: ${input.favorite_foods || "sin preferencia"}
- No le gusta: ${input.disliked_foods || "sin exclusión"}
- Comidas por día: ${input.meals_per_day}
- Presupuesto: ${input.budget}

Incluí ${input.meals_per_day} comidas principales + snacks si calorías lo requieren.
`.trim();
}

const GeneratedPlanSchema = z.object({
  title: z.string(),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  reasoning: z.string(),
  meals: z.array(z.object({
    name: z.string(),
    time: z.string().optional(),
    items: z.array(z.object({
      food: z.string(),
      quantity: z.string(),
      notes: z.string().optional(),
    })),
  })),
  shopping_list: z.array(z.string()).optional(),
});

/* ============== GET HISTORY ============== */

export const getDietHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("diets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
  });

export const getActiveDiet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("diets")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return mapRow(data as Record<string, unknown>);
    const { data: latest } = await supabase
      .from("diets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return latest ? mapRow(latest as Record<string, unknown>) : null;
  });

export const getDietById = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("diets")
      .select("*")
      .eq("user_id", userId)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Dieta no encontrada");
    return mapRow(row as Record<string, unknown>);
  });

/* ============== GENERATE ============== */

export const generateDiet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DietGenerateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const raw = await callDietAI(DIET_SYSTEM_PROMPT, buildProfileBlock(data));
    const parsed = GeneratedPlanSchema.parse(parseAIJson(raw));

    await supabase.from("diets").update({ is_active: false }).eq("user_id", userId).eq("is_active", true);

    const restrictions = [
      ...data.restrictions,
      ...(data.allergies ? [`alergias: ${data.allergies}`] : []),
      ...(data.other_restrictions ? [data.other_restrictions] : []),
    ];

    const row = {
      user_id: userId,
      title: parsed.title.slice(0, 200),
      goal: data.goal,
      calories: Math.round(parsed.calories),
      protein_g: Math.round(parsed.protein_g),
      carbs_g: Math.round(parsed.carbs_g),
      fat_g: Math.round(parsed.fat_g),
      restrictions,
      meals: parsed.meals,
      replacements: [],
      reasoning: parsed.reasoning.slice(0, 4000),
      shopping_list: parsed.shopping_list ?? [],
      profile_snapshot: data,
      is_active: true,
    };

    const { data: inserted, error } = await supabase.from("diets").insert(row).select("*").single();
    if (error) throw new Error(error.message);
    return mapRow(inserted as Record<string, unknown>);
  });

/* ============== REPLACE INGREDIENTS ============== */

export const replaceDietIngredients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      diet_id: z.string().uuid(),
      missing_items: z.array(z.string().min(1).max(120)).min(1).max(10),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: diet, error } = await supabase
      .from("diets")
      .select("*")
      .eq("user_id", userId)
      .eq("id", data.diet_id)
      .maybeSingle();
    if (error || !diet) throw new Error("Dieta no encontrada");

    const userPrompt = `
Plan actual (JSON):
${JSON.stringify({ meals: diet.meals, calories: diet.calories, protein_g: diet.protein_g, carbs_g: diet.carbs_g, fat_g: diet.fat_g })}

El usuario NO tiene disponibles: ${data.missing_items.join(", ")}

Reemplazá esos alimentos manteniendo balance nutricional similar. Actualizá las comidas afectadas.
`.trim();

    const raw = await callDietAI(REPLACE_SYSTEM_PROMPT, userPrompt);
    const parsed = parseAIJson<{
      meals: DietMeal[];
      replacements: DietReplacement[];
      calories?: number;
      protein_g?: number;
      carbs_g?: number;
      fat_g?: number;
    }>(raw);

    const newReplacements = [
      ...(diet.replacements as DietReplacement[]),
      ...(parsed.replacements ?? []).map((r) => ({
        ...r,
        applied_at: new Date().toISOString(),
      })),
    ];

    const { data: updated, error: upErr } = await supabase
      .from("diets")
      .update({
        meals: parsed.meals ?? diet.meals,
        replacements: newReplacements,
        calories: parsed.calories ?? diet.calories,
        protein_g: parsed.protein_g ?? diet.protein_g,
        carbs_g: parsed.carbs_g ?? diet.carbs_g,
        fat_g: parsed.fat_g ?? diet.fat_g,
      })
      .eq("id", data.diet_id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (upErr) throw new Error(upErr.message);
    return mapRow(updated as Record<string, unknown>);
  });

/* ============== CRUD ============== */

export const deleteDiet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("diets").delete().eq("user_id", userId).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateDiet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: src, error } = await supabase
      .from("diets")
      .select("*")
      .eq("user_id", userId)
      .eq("id", data.id)
      .maybeSingle();
    if (error || !src) throw new Error("Dieta no encontrada");

    const { data: inserted, error: insErr } = await supabase
      .from("diets")
      .insert({
        user_id: userId,
        title: `${src.title} (copia)`,
        goal: src.goal,
        calories: src.calories,
        protein_g: src.protein_g,
        carbs_g: src.carbs_g,
        fat_g: src.fat_g,
        restrictions: src.restrictions,
        meals: src.meals,
        replacements: [],
        reasoning: src.reasoning,
        shopping_list: src.shopping_list,
        profile_snapshot: src.profile_snapshot,
        is_active: false,
      })
      .select("*")
      .single();
    if (insErr) throw new Error(insErr.message);
    return mapRow(inserted as Record<string, unknown>);
  });

export const setActiveDiet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("diets").update({ is_active: false }).eq("user_id", userId);
    const { data: updated, error } = await supabase
      .from("diets")
      .update({ is_active: true })
      .eq("user_id", userId)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapRow(updated as Record<string, unknown>);
  });

export const updateDietTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), title: z.string().min(1).max(200) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: updated, error } = await supabase
      .from("diets")
      .update({ title: data.title })
      .eq("user_id", userId)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapRow(updated as Record<string, unknown>);
  });

/* ============== WEEKLY ADHERENCE ============== */

export type DietCheckin = {
  id: string;
  diet_id: string;
  date: string;
  meals_completed: number;
  meals_total: number;
  notes: string;
};

export type WeeklyAdherenceDay = {
  date: string;
  day_label: string;
  meals_completed: number;
  meals_total: number;
  pct: number;
  is_today: boolean;
};

export type WeeklyAdherence = {
  days: WeeklyAdherenceDay[];
  week_avg_pct: number;
  streak_days: number;
};

function mondayOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

export const getWeeklyAdherence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ diet_id: z.string().uuid(), meals_total: z.number().int().min(1).max(10) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const today = new Date();
    const monday = mondayOfWeek(today);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const { data: rows, error } = await supabase
      .from("diet_checkins")
      .select("*")
      .eq("user_id", userId)
      .eq("diet_id", data.diet_id)
      .gte("date", isoDate(monday))
      .lte("date", isoDate(sunday));
    if (error) throw new Error(error.message);

    const byDate = new Map(
      (rows ?? []).map((r) => [String(r.date), r as Record<string, unknown>])
    );

    const todayIso = isoDate(today);
    const days: WeeklyAdherenceDay[] = [];
    let totalPct = 0;
    let daysWithData = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = isoDate(d);
      const row = byDate.get(dateStr);
      const completed = row ? Number(row.meals_completed ?? 0) : 0;
      const total = row ? Number(row.meals_total ?? data.meals_total) : data.meals_total;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      if (row) {
        totalPct += pct;
        daysWithData++;
      }
      days.push({
        date: dateStr,
        day_label: DAY_LABELS[i],
        meals_completed: completed,
        meals_total: total,
        pct,
        is_today: dateStr === todayIso,
      });
    }

    // Streak: consecutive days ending today with >= 80% adherence
    let streak = 0;
    const todayIdx = days.findIndex((d) => d.is_today);
    for (let i = todayIdx; i >= 0; i--) {
      if (days[i].pct >= 80) streak++;
      else break;
    }

    return {
      days,
      week_avg_pct: daysWithData > 0 ? Math.round(totalPct / daysWithData) : 0,
      streak_days: streak,
    } satisfies WeeklyAdherence;
  });

export const logDietCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      diet_id: z.string().uuid(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      meals_completed: z.number().int().min(0).max(10),
      meals_total: z.number().int().min(1).max(10),
      notes: z.string().max(500).optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("diet_checkins")
      .upsert(
        {
          user_id: userId,
          diet_id: data.diet_id,
          date: data.date,
          meals_completed: Math.min(data.meals_completed, data.meals_total),
          meals_total: data.meals_total,
          notes: data.notes ?? "",
        },
        { onConflict: "user_id,diet_id,date" }
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return {
      id: String(row.id),
      diet_id: String(row.diet_id),
      date: String(row.date),
      meals_completed: Number(row.meals_completed),
      meals_total: Number(row.meals_total),
      notes: String(row.notes ?? ""),
    } satisfies DietCheckin;
  });
