import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  generateDiet,
  getDietHistory,
  getActiveDiet,
  replaceDietIngredients,
  deleteDiet,
  duplicateDiet,
  setActiveDiet,
  getWeeklyAdherence,
  logDietCheckin,
  type DietPlan,
  type DietGenerateInput,
  type WeeklyAdherence,
} from "@/lib/diet.functions";
import { exportDietToPdf } from "@/lib/diet-export";
import { useForge, todayISO } from "@/lib/forge-store";
import { ForgeButton } from "./ui/ForgeButton";
import { ForgeCard } from "./ui/ForgeCard";
import { PressableBtn, Stagger, StaggerItem } from "./motion/ForgeMotion";
import { TypingIndicator } from "./ui/TypingIndicator";

type SubTab = "current" | "history" | "new";

const GOAL_OPTIONS: { v: DietGenerateInput["goal"]; l: string }[] = [
  { v: "fat_loss", l: "Bajar grasa" },
  { v: "muscle_gain", l: "Ganar masa muscular" },
  { v: "maintain", l: "Mantener peso" },
  { v: "performance", l: "Mejorar rendimiento" },
  { v: "recomposition", l: "Recomposición corporal" },
];

const RESTRICTION_OPTIONS = [
  "Vegano", "Vegetariano", "Celíaco", "Sin lactosa", "Diabético", "Hipertenso",
];

const ACTIVITY_OPTIONS: { v: DietGenerateInput["activity_level"]; l: string }[] = [
  { v: "sedentary", l: "Sedentario" },
  { v: "light", l: "Actividad ligera" },
  { v: "moderate", l: "Moderada" },
  { v: "active", l: "Activa" },
  { v: "very_active", l: "Muy activa" },
];

const GOAL_LABELS: Record<string, string> = Object.fromEntries(GOAL_OPTIONS.map((o) => [o.v, o.l]));

export default function DietSection({
  startWizard = false,
  onWizardOpened,
}: {
  startWizard?: boolean;
  onWizardOpened?: () => void;
}) {
  const [subTab, setSubTab] = useState<SubTab>(startWizard ? "new" : "current");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const qc = useQueryClient();

  const fetchActive = useServerFn(getActiveDiet);
  const fetchHistory = useServerFn(getDietHistory);

  const { data: activeDiet, isLoading: loadingActive } = useQuery({
    queryKey: ["diet-active"],
    queryFn: () => fetchActive(),
  });
  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["diet-history"],
    queryFn: () => fetchHistory(),
  });

  const displayed = useMemo(() => {
    if (selectedId) return history.find((d) => d.id === selectedId) ?? activeDiet;
    return activeDiet;
  }, [selectedId, history, activeDiet]);

  useEffect(() => {
    if (startWizard) {
      setSubTab("new");
      onWizardOpened?.();
    }
  }, [startWizard, onWizardOpened]);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["diet-active"] });
    qc.invalidateQueries({ queryKey: ["diet-history"] });
  }

  return (
    <div className="diet-section">
      <div className="diet-subtabs" role="tablist">
        {([
          ["current", "Dieta actual"],
          ["history", "Historial"],
          ["new", "Generar nueva"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={subTab === id}
            className={`diet-subtab ${subTab === id ? "on" : ""}`}
            onClick={() => {
              setSubTab(id);
              if (id === "current") setSelectedId(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {subTab === "new" && (
          <motion.div
            key="new"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <DietWizard
              onGenerated={(d) => {
                refresh();
                setSelectedId(d.id);
                setSubTab("current");
              }}
            />
          </motion.div>
        )}

        {subTab === "current" && (
          <motion.div
            key="current"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {loadingActive ? (
              <ForgeCard><TypingIndicator /></ForgeCard>
            ) : displayed ? (
              <DietPlanView diet={displayed} onUpdated={refresh} />
            ) : (
              <ForgeCard className="diet-empty">
                <p className="label-sm" style={{ color: "var(--acc)" }}>SIN PLAN ACTIVO</p>
                <p className="diet-empty-text">
                  Generá tu primera dieta personalizada con el Coach IA. Te haremos preguntas sobre objetivos, restricciones y preferencias.
                </p>
                <PressableBtn className="btn" onClick={() => setSubTab("new")}>
                  Crear mi dieta
                </PressableBtn>
              </ForgeCard>
            )}
          </motion.div>
        )}

        {subTab === "history" && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {loadingHistory ? (
              <ForgeCard><TypingIndicator /></ForgeCard>
            ) : history.length === 0 ? (
              <ForgeCard className="diet-empty">
                <p className="label-sm">Sin historial todavía.</p>
              </ForgeCard>
            ) : (
              <Stagger>
                {history.map((d) => (
                  <StaggerItem key={d.id}>
                    <DietHistoryCard
                      diet={d}
                      onOpen={() => {
                        setSelectedId(d.id);
                        setSubTab("current");
                      }}
                      onRefresh={refresh}
                    />
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Wizard ─── */
const WIZARD_STEPS = 5;

function DietWizard({ onGenerated }: { onGenerated: (d: DietPlan) => void }) {
  const forge = useForge();
  const gen = useServerFn(generateDiet);
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<DietGenerateInput>>(() => ({
    goal: "muscle_gain",
    age: forge.answers?.age ?? 25,
    sex: "male",
    weight_kg: forge.answers?.weight ?? 70,
    height_cm: 170,
    activity_level: "moderate",
    training_frequency: forge.answers?.daysPerWeek ?? 4,
    restrictions: [],
    allergies: "",
    other_restrictions: "",
    favorite_foods: "",
    disliked_foods: "",
    meals_per_day: 4,
    budget: "medium",
    name: forge.answers?.name,
    training_goal: forge.answers?.goal,
    training_days: forge.answers?.daysPerWeek,
  }));

  function setField<K extends keyof DietGenerateInput>(k: K, v: DietGenerateInput[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function toggleRestriction(r: string) {
    setForm((p) => {
      const cur = p.restrictions ?? [];
      return {
        ...p,
        restrictions: cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r],
      };
    });
  }

  async function submit() {
    setGenerating(true);
    setError(null);
    try {
      const d = await gen({ data: form as DietGenerateInput });
      onGenerated(d);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? "Error al generar");
    } finally {
      setGenerating(false);
    }
  }

  const canNext = (() => {
    switch (step) {
      case 0: return !!form.goal;
      case 1: return form.age && form.weight_kg && form.height_cm && form.sex;
      case 2: return form.activity_level && form.training_frequency !== undefined;
      case 3: return true;
      case 4: return form.meals_per_day && form.budget;
      default: return true;
    }
  })();

  if (generating) {
    return (
      <ForgeCard className="diet-generating">
        <TypingIndicator />
        <p className="diet-gen-msg">El Coach IA está diseñando tu plan nutricional personalizado…</p>
      </ForgeCard>
    );
  }

  return (
    <div className="diet-wizard">
      <div className="diet-wizard-progress">
        <div className="diet-wizard-bar" style={{ width: `${((step + 1) / WIZARD_STEPS) * 100}%` }} />
      </div>
      <p className="label-sm mono">PASO {step + 1}/{WIZARD_STEPS}</p>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
        >
          {step === 0 && (
            <ForgeCard>
              <h3 className="diet-step-title">¿Cuál es tu objetivo nutricional?</h3>
              <div className="diet-opt-list">
                {GOAL_OPTIONS.map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    className={`opt-btn ${form.goal === o.v ? "sel" : ""}`}
                    onClick={() => setField("goal", o.v)}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </ForgeCard>
          )}

          {step === 1 && (
            <ForgeCard>
              <h3 className="diet-step-title">Datos físicos</h3>
              <label className="diet-label">Sexo</label>
              <div className="g2" style={{ marginBottom: 12 }}>
                {(["male", "female", "other"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`opt-btn ${form.sex === s ? "sel" : ""}`}
                    onClick={() => setField("sex", s)}
                  >
                    {s === "male" ? "Hombre" : s === "female" ? "Mujer" : "Otro"}
                  </button>
                ))}
              </div>
              <label className="diet-label">Edad</label>
              <input type="number" value={form.age ?? ""} onChange={(e) => setField("age", Number(e.target.value))} />
              <label className="diet-label">Peso (kg)</label>
              <input type="number" value={form.weight_kg ?? ""} onChange={(e) => setField("weight_kg", Number(e.target.value))} />
              <label className="diet-label">Altura (cm)</label>
              <input type="number" value={form.height_cm ?? ""} onChange={(e) => setField("height_cm", Number(e.target.value))} />
            </ForgeCard>
          )}

          {step === 2 && (
            <ForgeCard>
              <h3 className="diet-step-title">Actividad y entrenamiento</h3>
              <label className="diet-label">Nivel de actividad diaria</label>
              <div className="diet-opt-list">
                {ACTIVITY_OPTIONS.map((o) => (
                  <button key={o.v} type="button" className={`opt-btn ${form.activity_level === o.v ? "sel" : ""}`} onClick={() => setField("activity_level", o.v)}>
                    {o.l}
                  </button>
                ))}
              </div>
              <label className="diet-label">Días de entrenamiento / semana</label>
              <input type="number" min={0} max={7} value={form.training_frequency ?? ""} onChange={(e) => setField("training_frequency", Number(e.target.value))} />
            </ForgeCard>
          )}

          {step === 3 && (
            <ForgeCard>
              <h3 className="diet-step-title">Restricciones alimenticias</h3>
              <p className="diet-hint">Seleccioná todas las que apliquen. Es obligatorio declarar condiciones.</p>
              <div className="diet-chip-grid">
                {RESTRICTION_OPTIONS.map((r) => (
                  <button key={r} type="button" className={`ci-chip ${(form.restrictions ?? []).includes(r) ? "sev-2" : ""}`} onClick={() => toggleRestriction(r)}>
                    {r}
                  </button>
                ))}
              </div>
              <label className="diet-label">Alergias alimentarias</label>
              <input placeholder="Ej: maní, mariscos…" value={form.allergies ?? ""} onChange={(e) => setField("allergies", e.target.value)} />
              <label className="diet-label">Otras restricciones o condiciones</label>
              <textarea placeholder="Ej: hipotiroidismo, embarazo…" value={form.other_restrictions ?? ""} onChange={(e) => setField("other_restrictions", e.target.value)} />
            </ForgeCard>
          )}

          {step === 4 && (
            <ForgeCard>
              <h3 className="diet-step-title">Preferencias</h3>
              <label className="diet-label">Comidas favoritas</label>
              <input placeholder="Ej: pollo, arroz, huevos…" value={form.favorite_foods ?? ""} onChange={(e) => setField("favorite_foods", e.target.value)} />
              <label className="diet-label">Alimentos que no te gustan</label>
              <input placeholder="Ej: pescado, brócoli…" value={form.disliked_foods ?? ""} onChange={(e) => setField("disliked_foods", e.target.value)} />
              <label className="diet-label">Comidas por día</label>
              <div className="g2">
                {[3, 4, 5, 6].map((n) => (
                  <button key={n} type="button" className={`opt-btn ${form.meals_per_day === n ? "sel" : ""}`} onClick={() => setField("meals_per_day", n)}>
                    {n} comidas
                  </button>
                ))}
              </div>
              <label className="diet-label">Presupuesto aproximado</label>
              <div className="g2">
                {(["low", "medium", "high"] as const).map((b) => (
                  <button key={b} type="button" className={`opt-btn ${form.budget === b ? "sel" : ""}`} onClick={() => setField("budget", b)}>
                    {b === "low" ? "Económico" : b === "medium" ? "Medio" : "Alto"}
                  </button>
                ))}
              </div>
            </ForgeCard>
          )}
        </motion.div>
      </AnimatePresence>

      {error && <p className="diet-error">{error}</p>}

      <div className="row diet-wizard-nav">
        {step > 0 && (
          <PressableBtn className="btnO" onClick={() => setStep(step - 1)} style={{ flex: 1 }}>
            ← Atrás
          </PressableBtn>
        )}
        {step < WIZARD_STEPS - 1 ? (
          <PressableBtn className="btn" disabled={!canNext} onClick={() => setStep(step + 1)} style={{ flex: 2 }}>
            Siguiente →
          </PressableBtn>
        ) : (
          <PressableBtn className="btn btn-cta" disabled={!canNext} onClick={submit} style={{ flex: 2 }}>
            Generar dieta con IA
          </PressableBtn>
        )}
      </div>
    </div>
  );
}

/* ─── Plan view ─── */
function DietPlanView({ diet, onUpdated }: { diet: DietPlan; onUpdated: () => void }) {
  const replaceFn = useServerFn(replaceDietIngredients);
  const [replacing, setReplacing] = useState(false);
  const [missingInput, setMissingInput] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const allFoods = useMemo(() => {
    const foods = new Set<string>();
    for (const m of diet.meals) {
      for (const item of m.items) foods.add(item.food);
    }
    return Array.from(foods);
  }, [diet.meals]);

  function toggleFood(f: string) {
    setSelectedItems((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  }

  async function applyReplace() {
    const items = [
      ...selectedItems,
      ...(missingInput.trim() ? [missingInput.trim()] : []),
    ];
    if (!items.length) return;
    setReplacing(true);
    try {
      await replaceFn({ data: { diet_id: diet.id, missing_items: items } });
      setSelectedItems([]);
      setMissingInput("");
      onUpdated();
    } finally {
      setReplacing(false);
    }
  }

  return (
    <Stagger>
      <StaggerItem>
        <ForgeCard variant="accent" className="diet-plan-header">
          <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span className="tag">{GOAL_LABELS[diet.goal] ?? diet.goal}</span>
            <div className="row" style={{ gap: 8 }}>
              <ForgeButton variant="ghost" size="sm" onClick={() => exportDietToPdf(diet)}>
                Exportar PDF
              </ForgeButton>
              {diet.is_active && <span className="tagG">ACTIVA</span>}
            </div>
          </div>
          <h2 className="diet-plan-title">{diet.title}</h2>
          <p className="diet-plan-date mono label-sm">
            {new Date(diet.created_at).toLocaleDateString("es-AR")}
          </p>
        </ForgeCard>
      </StaggerItem>

      <StaggerItem>
        <DietWeeklyTracker diet={diet} />
      </StaggerItem>

      <StaggerItem>
        <div className="g2 diet-macros">
          <div className="card diet-macro-card">
            <div className="stat-num">{diet.calories}</div>
            <div className="stat-lbl">kcal / día</div>
          </div>
          <div className="card diet-macro-card">
            <div className="stat-num">{diet.protein_g}g</div>
            <div className="stat-lbl">Proteína</div>
          </div>
          <div className="card diet-macro-card">
            <div className="stat-num">{diet.carbs_g}g</div>
            <div className="stat-lbl">Carbos</div>
          </div>
          <div className="card diet-macro-card">
            <div className="stat-num">{diet.fat_g}g</div>
            <div className="stat-lbl">Grasas</div>
          </div>
        </div>
      </StaggerItem>

      {diet.reasoning && (
        <StaggerItem>
          <ForgeCard variant="glass">
            <div className="label-sm" style={{ color: "var(--acc)" }}>ENFOQUE CIENTÍFICO</div>
            <p className="diet-reasoning">{diet.reasoning}</p>
          </ForgeCard>
        </StaggerItem>
      )}

      {diet.meals.map((meal, i) => (
        <StaggerItem key={i}>
          <ForgeCard className="diet-meal-card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3 className="diet-meal-name">{meal.name}</h3>
              {meal.time && <span className="mono label-sm">{meal.time}</span>}
            </div>
            <ul className="diet-meal-items">
              {meal.items.map((item, j) => (
                <li key={j}>
                  <strong>{item.quantity}</strong> {item.food}
                  {item.notes && <span className="diet-item-note"> · {item.notes}</span>}
                </li>
              ))}
            </ul>
          </ForgeCard>
        </StaggerItem>
      ))}

      {diet.replacements.length > 0 && (
        <StaggerItem>
          <ForgeCard>
            <div className="label-sm" style={{ color: "var(--acc)" }}>REEMPLAZOS APLICADOS</div>
            {diet.replacements.map((r, i) => (
              <div key={i} className="diet-replacement-row">
                <span className="diet-rep-missing">{r.missing}</span>
                <span>→</span>
                <span className="diet-rep-sub">{r.substitute}</span>
                <p className="diet-rep-explain">{r.explanation}</p>
              </div>
            ))}
          </ForgeCard>
        </StaggerItem>
      )}

      {diet.shopping_list.length > 0 && (
        <StaggerItem>
          <ForgeCard>
            <div className="label-sm" style={{ color: "var(--acc)" }}>LISTA DE COMPRAS</div>
            <ul className="diet-shopping">
              {diet.shopping_list.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </ForgeCard>
        </StaggerItem>
      )}

      <StaggerItem>
        <ForgeCard className="diet-replace-panel">
          <div className="label-sm" style={{ color: "var(--acc)" }}>¿TE FALTA ALGÚN INGREDIENTE?</div>
          <p className="diet-hint">Tocá los alimentos que no tenés y la IA sugerirá reemplazos equivalentes.</p>
          <div className="diet-food-chips">
            {allFoods.map((f) => (
              <button
                key={f}
                type="button"
                className={`diet-food-chip ${selectedItems.includes(f) ? "sel" : ""}`}
                onClick={() => toggleFood(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <input
            placeholder="O escribí otro alimento…"
            value={missingInput}
            onChange={(e) => setMissingInput(e.target.value)}
            style={{ marginTop: 10 }}
          />
          <PressableBtn
            className="btn"
            style={{ marginTop: 12 }}
            disabled={replacing || (selectedItems.length === 0 && !missingInput.trim())}
            onClick={applyReplace}
          >
            {replacing ? "Adaptando…" : "Reemplazar ingredientes"}
          </PressableBtn>
        </ForgeCard>
      </StaggerItem>
    </Stagger>
  );
}

/* ─── Weekly tracker ─── */
function DietWeeklyTracker({ diet }: { diet: DietPlan }) {
  const mealsTotal = diet.meals.length;
  const fetchWeekly = useServerFn(getWeeklyAdherence);
  const saveCheckin = useServerFn(logDietCheckin);
  const qc = useQueryClient();
  const today = todayISO();

  const { data: weekly, isLoading } = useQuery({
    queryKey: ["diet-weekly", diet.id],
    queryFn: () => fetchWeekly({ data: { diet_id: diet.id, meals_total: mealsTotal } }),
  });

  const todayDay = weekly?.days.find((d) => d.date === today);

  async function setTodayMeals(completed: number) {
    await saveCheckin({
      data: {
        diet_id: diet.id,
        date: today,
        meals_completed: completed,
        meals_total: mealsTotal,
      },
    });
    qc.invalidateQueries({ queryKey: ["diet-weekly", diet.id] });
  }

  async function cycleDay(date: string, current: number) {
    const next = current >= mealsTotal ? 0 : current + 1;
    await saveCheckin({
      data: {
        diet_id: diet.id,
        date,
        meals_completed: next,
        meals_total: mealsTotal,
      },
    });
    qc.invalidateQueries({ queryKey: ["diet-weekly", diet.id] });
  }

  if (isLoading) {
    return (
      <ForgeCard>
        <TypingIndicator />
      </ForgeCard>
    );
  }

  const w = weekly as WeeklyAdherence | undefined;

  return (
    <ForgeCard className="diet-weekly">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="label-sm" style={{ color: "var(--acc)" }}>SEGUIMIENTO SEMANAL</div>
          <p className="diet-weekly-sub">
            {w?.week_avg_pct ?? 0}% adherencia · racha {w?.streak_days ?? 0} días
          </p>
        </div>
      </div>

      <div className="diet-weekly-bar-wrap">
        <div
          className="diet-weekly-bar"
          style={{ width: `${w?.week_avg_pct ?? 0}%` }}
        />
      </div>

      <div className="diet-weekly-days">
        {(w?.days ?? []).map((d) => (
          <button
            key={d.date}
            type="button"
            className={`diet-weekly-day ${d.is_today ? "today" : ""} ${d.pct >= 80 ? "good" : d.pct > 0 ? "partial" : ""}`}
            onClick={() => cycleDay(d.date, d.meals_completed)}
            title={`${d.meals_completed}/${d.meals_total} comidas`}
          >
            <span className="diet-weekly-day-lbl">{d.day_label}</span>
            <span className="diet-weekly-day-pct">{d.pct > 0 ? `${d.pct}%` : "—"}</span>
          </button>
        ))}
      </div>

      <div className="diet-weekly-today">
        <p className="diet-hint">Hoy: {todayDay?.meals_completed ?? 0}/{mealsTotal} comidas</p>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <PressableBtn
            className="btnO"
            style={{ flex: 1 }}
            onClick={() => setTodayMeals(Math.max(0, (todayDay?.meals_completed ?? 0) - 1))}
          >
            − Comida
          </PressableBtn>
          <PressableBtn
            className="btn"
            style={{ flex: 1 }}
            onClick={() => setTodayMeals(Math.min(mealsTotal, (todayDay?.meals_completed ?? 0) + 1))}
          >
            + Comida
          </PressableBtn>
          <PressableBtn
            className="btn btn-cta"
            style={{ flex: 1 }}
            onClick={() => setTodayMeals(mealsTotal)}
          >
            Día completo
          </PressableBtn>
        </div>
      </div>
    </ForgeCard>
  );
}

/* ─── History card ─── */
function DietHistoryCard({
  diet,
  onOpen,
  onRefresh,
}: {
  diet: DietPlan;
  onOpen: () => void;
  onRefresh: () => void;
}) {
  const del = useServerFn(deleteDiet);
  const dup = useServerFn(duplicateDiet);
  const activate = useServerFn(setActiveDiet);

  async function handleDelete() {
    if (!confirm("¿Eliminar esta dieta?")) return;
    await del({ data: { id: diet.id } });
    onRefresh();
  }

  async function handleDuplicate() {
    await dup({ data: { id: diet.id } });
    onRefresh();
  }

  async function handleActivate() {
    await activate({ data: { id: diet.id } });
    onRefresh();
  }

  return (
    <ForgeCard className="diet-history-card">
      <button type="button" className="diet-history-main" onClick={onOpen}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="tag">{GOAL_LABELS[diet.goal] ?? diet.goal}</span>
          <span className="mono label-sm">{diet.calories} kcal</span>
        </div>
        <h3 className="diet-history-title">{diet.title}</h3>
        <p className="label-sm mono">{new Date(diet.created_at).toLocaleDateString("es-AR")}</p>
        {diet.restrictions.length > 0 && (
          <p className="diet-history-restrict">{diet.restrictions.slice(0, 3).join(" · ")}</p>
        )}
      </button>
      <div className="diet-history-actions">
        {!diet.is_active && (
          <ForgeButton variant="ghost" size="sm" onClick={handleActivate}>Activar</ForgeButton>
        )}
        <ForgeButton variant="ghost" size="sm" onClick={handleDuplicate}>Duplicar</ForgeButton>
        <ForgeButton variant="ghost" size="sm" onClick={handleDelete}>Eliminar</ForgeButton>
      </div>
    </ForgeCard>
  );
}
