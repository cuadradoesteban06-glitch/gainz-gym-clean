export type MuscleGroup =
  | "chest" | "back" | "shoulders" | "biceps" | "triceps"
  | "quads" | "hamstrings" | "glutes" | "calves" | "core";

export type Equipment = "none" | "dumbbells" | "full_gym";

export type ExerciseDef = {
  id: string;
  name: string;
  group: MuscleGroup;
  equipment: Equipment[];
  // % bodyweight (total carga) a nivel intermedio. undefined = peso corporal.
  loadCoef?: number;
  isCompound: boolean;
  tips: string[];
  videoQuery: string;
};

export type Exercise = {
  id: string;
  name: string;
  group: MuscleGroup;
  sets: number;
  reps: string;
  rest: number;
  xp: number;
  weightKg?: number; // sugerido, undefined si bodyweight
  tips: string[];
  videoUrl: string;
  isCompound: boolean;
};

export type Workout = {
  id: string;
  name: string;
  focus: string;
  exercises: Exercise[];
};

export type OnboardingAnswers = {
  name: string;
  goal: "strength" | "muscle" | "fat_loss" | "endurance";
  level: "beginner" | "intermediate" | "advanced";
  daysPerWeek: number;
  sessionLength: 30 | 45 | 60;
  equipment: Equipment;
  focusArea: "full" | "upper" | "lower" | "core";
  injuries: string;
  age: number;
  weight: number;
};

/* ============== BIBLIOTECA DE EJERCICIOS (basada en literatura de hipertrofia/fuerza) ============== */
export const EXERCISE_DB: ExerciseDef[] = [
  // CHEST
  { id: "bench", name: "Press banca con barra", group: "chest", equipment: ["full_gym"], loadCoef: 1.0, isCompound: true,
    tips: ["Retraé escápulas y mantenelas pegadas al banco.", "Barra baja al esternón, codos a ~75°.", "Pies firmes, glúteo en contacto."],
    videoQuery: "press banca barra técnica" },
  { id: "db_bench", name: "Press banca mancuernas", group: "chest", equipment: ["dumbbells","full_gym"], loadCoef: 0.7, isCompound: true,
    tips: ["Bajá hasta sentir estiramiento en el pecho.", "Muñeca alineada con codo.", "Controlá el descenso 2-3s."],
    videoQuery: "press banca mancuernas técnica" },
  { id: "incline_db", name: "Press inclinado mancuernas", group: "chest", equipment: ["dumbbells","full_gym"], loadCoef: 0.6, isCompound: true,
    tips: ["Banco a 30°, no más de 45°.", "Codos ligeramente adelantados al cuerpo.", "Empujá las pesas hacia adentro arriba."],
    videoQuery: "press inclinado mancuernas técnica" },
  { id: "pushup", name: "Flexiones", group: "chest", equipment: ["none","dumbbells","full_gym"], isCompound: true,
    tips: ["Cuerpo en línea recta, glúteo activo.", "Codos a 45° del torso, no abiertos.", "Bajá hasta tocar el piso con el pecho."],
    videoQuery: "flexiones técnica correcta" },
  { id: "dips", name: "Fondos en paralelas", group: "chest", equipment: ["full_gym"], isCompound: true,
    tips: ["Inclinate hacia adelante para pecho.", "Bajá hasta que el hombro esté bajo el codo.", "No bloquees codos arriba."],
    videoQuery: "fondos paralelas pecho técnica" },
  { id: "fly_db", name: "Aperturas con mancuernas", group: "chest", equipment: ["dumbbells","full_gym"], loadCoef: 0.30, isCompound: false,
    tips: ["Codos semiflexionados fijos.", "Movimiento amplio sin tocar arriba.", "Sentí el pecho estirar."],
    videoQuery: "aperturas mancuernas pecho técnica" },

  // BACK
  { id: "deadlift", name: "Peso muerto convencional", group: "back", equipment: ["full_gym"], loadCoef: 1.5, isCompound: true,
    tips: ["Barra pegada al cuerpo todo el recorrido.", "Espalda neutra, pecho arriba.", "Empujá el piso, no tires con la espalda."],
    videoQuery: "peso muerto convencional técnica" },
  { id: "pullup", name: "Dominadas", group: "back", equipment: ["full_gym"], isCompound: true,
    tips: ["Tirá con los codos hacia el bolsillo trasero.", "Mentón sobre la barra, sin balanceo.", "Bajá controlado 2s."],
    videoQuery: "dominadas técnica correcta" },
  { id: "lat_pull", name: "Jalón al pecho (polea)", group: "back", equipment: ["full_gym"], loadCoef: 0.7, isCompound: true,
    tips: ["Pecho arriba, leve inclinación atrás.", "Tirá los codos abajo, no la barra.", "Pausá 1s con la barra cerca del pecho."],
    videoQuery: "jalón polea técnica" },
  { id: "barbell_row", name: "Remo con barra", group: "back", equipment: ["full_gym"], loadCoef: 0.9, isCompound: true,
    tips: ["Torso ~45°, espalda neutra.", "Tirá la barra al ombligo bajo.", "Apretá escápulas arriba."],
    videoQuery: "remo barra Pendlay técnica" },
  { id: "db_row", name: "Remo a una mano con mancuerna", group: "back", equipment: ["dumbbells","full_gym"], loadCoef: 0.30, isCompound: true,
    tips: ["Apoyate firme en banco.", "Codo cerca del cuerpo, tirá hacia la cadera.", "Estirá completamente abajo."],
    videoQuery: "remo mancuerna una mano técnica" },
  { id: "inv_row", name: "Remo invertido (australiano)", group: "back", equipment: ["none","dumbbells","full_gym"], isCompound: true,
    tips: ["Cuerpo recto, glúteo activo.", "Pecho hacia la barra/mesa.", "Cuanto más horizontal, más difícil."],
    videoQuery: "remo invertido australiano técnica" },

  // SHOULDERS
  { id: "ohp", name: "Press militar con barra", group: "shoulders", equipment: ["full_gym"], loadCoef: 0.65, isCompound: true,
    tips: ["Glúteo y core apretados, sin arquear lumbar.", "Pasá la cabeza adelante al final del press.", "Codos un poco adelante del torso."],
    videoQuery: "press militar barra técnica" },
  { id: "db_ohp", name: "Press hombros mancuernas", group: "shoulders", equipment: ["dumbbells","full_gym"], loadCoef: 0.45, isCompound: true,
    tips: ["Sentado con respaldo o de pie con core firme.", "Codos a ~45° del frente.", "No bloquees codos arriba."],
    videoQuery: "press militar mancuernas técnica" },
  { id: "lat_raise", name: "Elevaciones laterales", group: "shoulders", equipment: ["dumbbells","full_gym"], loadCoef: 0.10, isCompound: false,
    tips: ["Codo apenas flexionado fijo.", "Subí con el codo, no con la muñeca.", "No pases mucho de la línea del hombro."],
    videoQuery: "elevaciones laterales hombro técnica" },
  { id: "face_pull", name: "Face pull", group: "shoulders", equipment: ["full_gym"], loadCoef: 0.20, isCompound: false,
    tips: ["Cuerda hacia la frente, codos altos.", "Apretá escápulas y rotá externamente.", "Peso liviano, rango completo."],
    videoQuery: "face pull técnica" },
  { id: "pike_pu", name: "Pike push-ups", group: "shoulders", equipment: ["none"], isCompound: true,
    tips: ["Cadera alta, forma de V invertida.", "Bajá la cabeza entre las manos.", "Cuanto más vertical, más difícil."],
    videoQuery: "pike push up técnica" },

  // BICEPS
  { id: "barbell_curl", name: "Curl con barra", group: "biceps", equipment: ["full_gym"], loadCoef: 0.35, isCompound: false,
    tips: ["Codos pegados al cuerpo, no balancees.", "Subí controlado, apretá arriba.", "Bajada lenta 2-3s."],
    videoQuery: "curl barra bíceps técnica" },
  { id: "db_curl", name: "Curl mancuernas alterno", group: "biceps", equipment: ["dumbbells","full_gym"], loadCoef: 0.18, isCompound: false,
    tips: ["Supiná la muñeca al subir.", "Codo fijo en el costado.", "Sin balanceo del torso."],
    videoQuery: "curl bíceps mancuernas alterno técnica" },
  { id: "hammer", name: "Curl martillo", group: "biceps", equipment: ["dumbbells","full_gym"], loadCoef: 0.18, isCompound: false,
    tips: ["Palmas enfrentadas todo el rango.", "Trabaja braquial y antebrazo.", "Codo quieto."],
    videoQuery: "curl martillo bíceps técnica" },
  { id: "chin_up", name: "Dominada supinada", group: "biceps", equipment: ["full_gym"], isCompound: true,
    tips: ["Agarre supino al ancho de hombros.", "Tirá pensando en el bíceps.", "Bajada controlada."],
    videoQuery: "dominada supinada técnica" },

  // TRICEPS
  { id: "close_bench", name: "Press cerrado con barra", group: "triceps", equipment: ["full_gym"], loadCoef: 0.70, isCompound: true,
    tips: ["Agarre al ancho de hombros, no más cerrado.", "Codos pegados al cuerpo.", "Barra baja a parte baja del pecho."],
    videoQuery: "press banca cerrado técnica" },
  { id: "cable_tri", name: "Extensión tríceps polea", group: "triceps", equipment: ["full_gym"], loadCoef: 0.30, isCompound: false,
    tips: ["Codos fijos al costado del cuerpo.", "Extendé completo, apretá abajo.", "Sin usar el hombro."],
    videoQuery: "extensión tríceps polea técnica" },
  { id: "db_skull", name: "Francés con mancuernas", group: "triceps", equipment: ["dumbbells","full_gym"], loadCoef: 0.20, isCompound: false,
    tips: ["Codos apuntan al techo, fijos.", "Bajá hasta los lados de la cabeza.", "Sin abrir los codos."],
    videoQuery: "francés tríceps mancuernas técnica" },
  { id: "dips_bench", name: "Fondos en banco", group: "triceps", equipment: ["none","dumbbells","full_gym"], isCompound: true,
    tips: ["Codos hacia atrás, no afuera.", "Bajá hasta 90° en codo.", "Hombros lejos de las orejas."],
    videoQuery: "fondos en banco tríceps técnica" },
  { id: "diamond_pu", name: "Flexiones diamante", group: "triceps", equipment: ["none","dumbbells","full_gym"], isCompound: true,
    tips: ["Manos juntas formando diamante.", "Codos pegados al torso.", "Bajá hasta tocar las manos."],
    videoQuery: "flexiones diamante técnica" },

  // QUADS
  { id: "squat", name: "Sentadilla con barra", group: "quads", equipment: ["full_gym"], loadCoef: 1.2, isCompound: true,
    tips: ["Pies al ancho de hombros, puntas afuera.", "Bajá hasta romper paralela, rodillas siguen los pies.", "Pecho arriba, core firme."],
    videoQuery: "sentadilla barra técnica" },
  { id: "goblet", name: "Sentadilla goblet", group: "quads", equipment: ["dumbbells","full_gym"], loadCoef: 0.35, isCompound: true,
    tips: ["Mancuerna pegada al pecho.", "Codos adentro de las rodillas abajo.", "Profundidad completa."],
    videoQuery: "sentadilla goblet técnica" },
  { id: "lunge", name: "Zancadas alternas", group: "quads", equipment: ["none","dumbbells","full_gym"], loadCoef: 0.25, isCompound: true,
    tips: ["Paso largo, torso vertical.", "Rodilla trasera roza el piso.", "Empujá con el talón delantero."],
    videoQuery: "zancadas técnica correcta" },
  { id: "bulgarian", name: "Sentadilla búlgara", group: "quads", equipment: ["none","dumbbells","full_gym"], loadCoef: 0.25, isCompound: true,
    tips: ["Pie atrás elevado en banco.", "Peso en talón delantero.", "Torso ligeramente adelante."],
    videoQuery: "sentadilla búlgara técnica" },
  { id: "leg_press", name: "Prensa de piernas", group: "quads", equipment: ["full_gym"], loadCoef: 1.8, isCompound: true,
    tips: ["Pies en mitad superior de la plataforma.", "Bajá hasta 90° sin despegar cadera.", "No bloquees rodillas arriba."],
    videoQuery: "prensa piernas técnica" },
  { id: "bw_squat", name: "Sentadillas peso corporal", group: "quads", equipment: ["none"], isCompound: true,
    tips: ["Profundidad completa.", "Brazos al frente para balance.", "Tempo lento para más estímulo."],
    videoQuery: "sentadilla peso corporal técnica" },

  // HAMSTRINGS / GLUTES
  { id: "rdl", name: "Peso muerto rumano", group: "hamstrings", equipment: ["dumbbells","full_gym"], loadCoef: 0.9, isCompound: true,
    tips: ["Rodillas levemente flexionadas y fijas.", "Cadera atrás, barra pegada al cuerpo.", "Bajá hasta media tibia con espalda neutra."],
    videoQuery: "peso muerto rumano técnica" },
  { id: "hip_thrust", name: "Hip thrust", group: "glutes", equipment: ["dumbbells","full_gym"], loadCoef: 1.0, isCompound: true,
    tips: ["Espalda alta en banco, mentón al pecho.", "Apretá glúteo arriba, cadera completa.", "Pies plantados, tibias verticales."],
    videoQuery: "hip thrust técnica" },
  { id: "leg_curl", name: "Curl femoral", group: "hamstrings", equipment: ["full_gym"], loadCoef: 0.40, isCompound: false,
    tips: ["Cadera apoyada, sin despegar.", "Apretá fuerte arriba.", "Bajada controlada."],
    videoQuery: "curl femoral máquina técnica" },
  { id: "glute_bridge", name: "Puente de glúteo", group: "glutes", equipment: ["none","dumbbells","full_gym"], isCompound: true,
    tips: ["Apretá glúteo, no lumbar.", "Pausá 1s arriba.", "Pies firmes, tibias verticales."],
    videoQuery: "puente glúteo técnica" },

  // CALVES
  { id: "calf_raise", name: "Elevación de gemelos", group: "calves", equipment: ["none","dumbbells","full_gym"], loadCoef: 0.30, isCompound: false,
    tips: ["Rango completo, pausá arriba 1s.", "Bajá lento, estirá abajo.", "Variá pie recto/adentro/afuera."],
    videoQuery: "elevación gemelos técnica" },

  // CORE
  { id: "plank", name: "Plancha frontal", group: "core", equipment: ["none","dumbbells","full_gym"], isCompound: false,
    tips: ["Cuerpo en línea, glúteo activo.", "No hundas la cadera.", "Respirá normal."],
    videoQuery: "plancha frontal técnica" },
  { id: "hanging_leg", name: "Elevación de piernas colgado", group: "core", equipment: ["full_gym"], isCompound: false,
    tips: ["Sin balanceo, control puro.", "Subí hasta paralelo o más.", "Bajá lento."],
    videoQuery: "elevación piernas colgado técnica" },
  { id: "ab_wheel", name: "Crunch abdominal", group: "core", equipment: ["none","dumbbells","full_gym"], isCompound: false,
    tips: ["Pelvis fija al piso.", "Acercá costillas a cadera.", "Sin tirar del cuello."],
    videoQuery: "crunch abdominal técnica" },
  { id: "russian", name: "Russian twist", group: "core", equipment: ["none","dumbbells","full_gym"], isCompound: false,
    tips: ["Torso a 45°, espalda neutra.", "Rotación desde el tronco.", "Pies elevados para más dificultad."],
    videoQuery: "russian twist técnica" },
];

/* ============== SPLITS BASADOS EN CIENCIA ============== */
type SplitDay = { focus: string; groups: MuscleGroup[]; primary?: MuscleGroup[] };

function splitByDays(days: number, focusArea: OnboardingAnswers["focusArea"]): SplitDay[] {
  if (focusArea === "core") {
    return Array.from({ length: days }, () => ({ focus: "CORE & ABS", groups: ["core"] as MuscleGroup[] }));
  }
  if (focusArea === "upper") {
    return Array.from({ length: days }, (_, i) => {
      const pushDay = i % 2 === 0;
      return pushDay
        ? { focus: "PUSH (PECHO/HOMBRO/TRÍCEPS)", groups: ["chest","shoulders","triceps"] as MuscleGroup[] }
        : { focus: "PULL (ESPALDA/BÍCEPS)", groups: ["back","biceps"] as MuscleGroup[] };
    });
  }
  if (focusArea === "lower") {
    return Array.from({ length: days }, (_, i) => {
      const quadDay = i % 2 === 0;
      return quadDay
        ? { focus: "CUÁDRICEPS / GLÚTEO", groups: ["quads","glutes","calves"] as MuscleGroup[] }
        : { focus: "POSTERIOR / GLÚTEO", groups: ["hamstrings","glutes","calves"] as MuscleGroup[] };
    });
  }

  // FULL BODY → split científico por días
  switch (days) {
    case 2:
      return [
        { focus: "FULL BODY A", groups: ["quads","chest","back","core"], primary: ["quads","chest"] },
        { focus: "FULL BODY B", groups: ["hamstrings","shoulders","back","core"], primary: ["hamstrings","back"] },
      ];
    case 3:
      return [
        { focus: "PUSH (PECHO/HOMBRO/TRÍCEPS)", groups: ["chest","shoulders","triceps"] },
        { focus: "PULL (ESPALDA/BÍCEPS)", groups: ["back","biceps"] },
        { focus: "PIERNA COMPLETA", groups: ["quads","hamstrings","glutes","calves","core"] },
      ];
    case 4:
      return [
        { focus: "UPPER A (PECHO/ESPALDA)", groups: ["chest","back","triceps","biceps"] },
        { focus: "LOWER A (CUÁDRICEPS)", groups: ["quads","glutes","calves","core"] },
        { focus: "UPPER B (HOMBRO/BRAZOS)", groups: ["shoulders","triceps","biceps","back"] },
        { focus: "LOWER B (POSTERIOR)", groups: ["hamstrings","glutes","quads","core"] },
      ];
    case 5:
      return [
        { focus: "PECHO + TRÍCEPS", groups: ["chest","triceps"] },
        { focus: "ESPALDA + BÍCEPS", groups: ["back","biceps"] },
        { focus: "PIERNA", groups: ["quads","hamstrings","glutes","calves"] },
        { focus: "HOMBRO + CORE", groups: ["shoulders","core"] },
        { focus: "FULL BODY / DÉBILES", groups: ["back","chest","quads","biceps","triceps"] },
      ];
    case 6:
      return [
        { focus: "PUSH A", groups: ["chest","shoulders","triceps"] },
        { focus: "PULL A", groups: ["back","biceps"] },
        { focus: "LEGS A", groups: ["quads","glutes","calves"] },
        { focus: "PUSH B", groups: ["shoulders","chest","triceps"] },
        { focus: "PULL B", groups: ["back","biceps"] },
        { focus: "LEGS B", groups: ["hamstrings","glutes","quads","core"] },
      ];
    default:
      return [{ focus: "FULL BODY", groups: ["quads","chest","back","shoulders","core"] }];
  }
}

/* ============== CÁLCULO DE PESO RECOMENDADO ============== */
function levelMult(level: OnboardingAnswers["level"]): number {
  return level === "beginner" ? 0.55 : level === "intermediate" ? 1.0 : 1.35;
}

function roundToStep(kg: number, step: number) {
  return Math.max(step, Math.round(kg / step) * step);
}

export function suggestWeight(def: ExerciseDef, bodyweight: number, level: OnboardingAnswers["level"]): number | undefined {
  if (def.loadCoef === undefined) return undefined;
  const total = def.loadCoef * bodyweight * levelMult(level);
  // mancuernas se usan en pares chicos
  const step = def.equipment.includes("full_gym") && def.isCompound ? 2.5 : 1;
  return roundToStep(total, step);
}

/* ============== ESQUEMAS DE SERIES/REPS POR OBJETIVO ============== */
function schemeFor(goal: OnboardingAnswers["goal"], level: OnboardingAnswers["level"], compound: boolean) {
  // [sets, reps, rest]
  const baseSets = level === "beginner" ? 3 : level === "intermediate" ? 4 : 5;
  switch (goal) {
    case "strength":
      return compound
        ? { sets: baseSets, reps: "4-6", rest: 150 }
        : { sets: 3, reps: "6-8", rest: 90 };
    case "muscle":
      return compound
        ? { sets: baseSets, reps: "6-10", rest: 90 }
        : { sets: 3, reps: "10-12", rest: 60 };
    case "fat_loss":
      return { sets: 3, reps: "12-15", rest: 45 };
    case "endurance":
      return { sets: 3, reps: "15-20", rest: 30 };
  }
}

/* ============== GENERACIÓN DE RUTINA ============== */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickExercises(groups: MuscleGroup[], eq: Equipment, count: number, primary?: MuscleGroup[]): ExerciseDef[] {
  const out: ExerciseDef[] = [];
  const used = new Set<string>();

  // 1 compuesto por grupo primario (o por los primeros grupos)
  const primaryGroups = primary ?? groups.slice(0, Math.min(2, groups.length));
  for (const g of primaryGroups) {
    const pool = shuffle(EXERCISE_DB.filter(e => e.group === g && e.equipment.includes(eq) && e.isCompound && !used.has(e.id)));
    if (pool[0]) { out.push(pool[0]); used.add(pool[0].id); }
    if (out.length >= count) return out;
  }

  // Resto: alternar grupos restantes, mezclando compuesto/aislado
  let rounds = 0;
  while (out.length < count && rounds < 6) {
    for (const g of groups) {
      if (out.length >= count) break;
      const pool = shuffle(EXERCISE_DB.filter(e => e.group === g && e.equipment.includes(eq) && !used.has(e.id)));
      if (pool[0]) { out.push(pool[0]); used.add(pool[0].id); }
    }
    rounds++;
  }
  return out;
}

function buildExercise(def: ExerciseDef, a: OnboardingAnswers): Exercise {
  const sch = schemeFor(a.goal, a.level, def.isCompound);
  const weight = suggestWeight(def, a.weight, a.level);
  const xp = (def.isCompound ? 20 : 12) + (sch.sets - 3) * 3;
  return {
    id: def.id,
    name: def.name,
    group: def.group,
    sets: sch.sets,
    reps: sch.reps,
    rest: sch.rest,
    xp: Math.max(10, xp),
    weightKg: weight,
    tips: def.tips,
    videoUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(def.videoQuery)}`,
    isCompound: def.isCompound,
  };
}

export function generateRoutine(a: OnboardingAnswers): Workout[] {
  const days = Math.min(Math.max(a.daysPerWeek, 2), 6);
  const exCount = a.sessionLength === 30 ? 4 : a.sessionLength === 45 ? 5 : 6;
  const split = splitByDays(days, a.focusArea);

  return split.map((day, i) => {
    const defs = pickExercises(day.groups, a.equipment, exCount, day.primary);
    return {
      id: `w${i + 1}`,
      name: `Día ${i + 1}`,
      focus: day.focus,
      exercises: defs.map(d => buildExercise(d, a)),
    };
  });
}

/* ============== LEVEL / XP ============== */
export const LEVELS = [
  { lvl: 1, xp: 0 }, { lvl: 2, xp: 100 }, { lvl: 3, xp: 250 }, { lvl: 4, xp: 500 },
  { lvl: 5, xp: 900 }, { lvl: 6, xp: 1400 }, { lvl: 7, xp: 2000 }, { lvl: 8, xp: 2800 },
  { lvl: 9, xp: 3800 }, { lvl: 10, xp: 5000 },
];

export function xpToLevel(xp: number) {
  let lvl = 1, nextXp = LEVELS[1].xp, currentLvlXp = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) {
      lvl = LEVELS[i].lvl;
      currentLvlXp = LEVELS[i].xp;
      nextXp = LEVELS[i + 1]?.xp ?? LEVELS[i].xp + 2000;
    }
  }
  const progress = nextXp === currentLvlXp ? 1 : (xp - currentLvlXp) / (nextXp - currentLvlXp);
  return { lvl, nextXp, currentLvlXp, progress, toNext: nextXp - xp };
}

export type Achievement = {
  id: string; name: string; desc: string;
  check: (s: { workouts: number; streak: number; xp: number; totalExercises: number }) => boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first", name: "PRIMER PASO", desc: "Completá tu primer entrenamiento", check: (s) => s.workouts >= 1 },
  { id: "five", name: "CONSTANCIA", desc: "5 entrenamientos completos", check: (s) => s.workouts >= 5 },
  { id: "ten", name: "DEDICACIÓN", desc: "10 entrenamientos completos", check: (s) => s.workouts >= 10 },
  { id: "streak3", name: "RACHA X3", desc: "3 días seguidos entrenando", check: (s) => s.streak >= 3 },
  { id: "streak7", name: "SEMANA PERFECTA", desc: "7 días seguidos", check: (s) => s.streak >= 7 },
  { id: "xp500", name: "500 XP", desc: "Acumulá 500 puntos de experiencia", check: (s) => s.xp >= 500 },
  { id: "xp1000", name: "1000 XP", desc: "Acumulá 1000 puntos de experiencia", check: (s) => s.xp >= 1000 },
  { id: "ex50", name: "MEDIO CENTENAR", desc: "50 ejercicios completados", check: (s) => s.totalExercises >= 50 },
];