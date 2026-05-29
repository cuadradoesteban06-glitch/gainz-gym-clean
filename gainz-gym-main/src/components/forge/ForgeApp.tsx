import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AppBootLoader,
  AnimatedSetBlock,
  ExerciseCard,
  OnboardingStep,
  PremiumHeader,
  PremiumNav,
  PremiumToast,
  PressableBtn,
  RestOverlay,
  RingProgress,
  SpringProgress,
  Stagger,
  StaggerItem,
  TabPanel,
  WorkoutShell,
  greetingForHour,
  tabDirection,
} from "./motion/ForgeMotion";
import {
  ACHIEVEMENTS,
  generateRoutine,
  xpToLevel,
  type Exercise,
  type OnboardingAnswers,
  type Workout,
} from "@/lib/forge-routines";
import {
  daysBetween,
  resetAll,
  setState,
  todayISO,
  useForge,
  bindUserSync,
  unbindUserSync,
  clearAllLocal,
  type SetLog,
} from "@/lib/forge-store";
import { LevelBadge, tierForXp } from "./LevelBadge";
import { AvatarEditor } from "./AvatarEditor";
import { CustomRoutineEditor, CustomRoutineView } from "./CustomRoutineEditor";
import type { CustomRoutine } from "@/lib/forge-store";
import { supabase } from "@/integrations/supabase/client";
import AuthScreen from "@/components/auth/AuthScreen";
import type { User } from "@supabase/supabase-js";
import InstallPrompt from "./InstallPrompt";
import gainzLogo from "@/assets/gainz-logo.png";
import CoachChat from "./CoachChat";
import DietSection from "./DietSection";
import ProgressCharts from "./ProgressCharts";
import { DailyCheckinModal, useTodayCheckin, useTodayOverride } from "./DailyCheckin";
import { ForgeBadgeRow } from "./ui/ForgeBadge";
import type { AdaptationBadgeId } from "@/lib/design-tokens";
import { useServerFn } from "@tanstack/react-start";
import { logExerciseSets, clearRoutineOverride, seedExerciseLogs } from "@/lib/coach.functions";
import { useQueryClient } from "@tanstack/react-query";

type Tab = "home" | "routine" | "coach" | "diet" | "history" | "profile";
type Screen =
  | { kind: "onboarding" }
  | { kind: "generating" }
  | { kind: "tab"; tab: Tab }
  | { kind: "workout"; workoutId: string }
  | { kind: "custom-new" }
  | { kind: "custom-edit"; id: string }
  | { kind: "custom-view"; id: string };

export default function ForgeApp() {
  const state = useForge();
  const [screen, setScreen] = useState<Screen>(() =>
    state.onboarded ? { kind: "tab", tab: "home" } : { kind: "onboarding" }
  );
  const [toast, setToast] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [dietStartWizard, setDietStartWizard] = useState(false);
  const prevTabRef = useRef<Tab>("home");
  const seedExercise = useServerFn(seedExerciseLogs);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null;
      if (u) {
        // Existing session â†’ pull from cloud
        await bindUserSync(u.id, { migrateLocalIfCloudEmpty: false });
        await maybeSeedLogs(u.id, seedExercise);
      }
      if (mounted) {
        setUser(u);
        setAuthReady(true);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (event === "SIGNED_OUT") {
        unbindUserSync();
        clearAllLocal();
        setScreen({ kind: "onboarding" });
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Sync screen when user state changes
  useEffect(() => {
    if (user) {
      setScreen((prev) =>
        prev.kind === "onboarding" && state.onboarded
          ? { kind: "tab", tab: "home" }
          : prev
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, state.onboarded]);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (!authReady) {
    return <AppBootLoader />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  // Auto-open daily check-in once per day on first app entry
  // (uses localStorage; placed after auth so we only nudge logged-in users)

  function showToast(t: string) {
    setToast(t);
    setTimeout(() => setToast(null), 2000);
  }

  return (
    <div className="forge">
      <div className="ambient-bg" aria-hidden />
      <div className="app-shell">
        <CheckinAutoOpener onOpen={() => setCheckinOpen(true)} />
        <DailyCheckinModal open={checkinOpen} onClose={() => setCheckinOpen(false)} onSaved={(msg) => showToast(msg ?? "Check-in guardado")} />
        {screen.kind === "onboarding" && (
          <Onboarding
            onDone={(answers) => {
              setScreen({ kind: "generating" });
              setTimeout(() => {
                const routine = generateRoutine(answers);
                setState((s) => ({
                  ...s,
                  onboarded: true,
                  answers,
                  routine,
                }));
                setScreen({ kind: "tab", tab: "home" });
              }, 1800);
            }}
          />
        )}

        {screen.kind === "generating" && <Generating />}

        {screen.kind === "tab" && (
          <>
            <PremiumHeader tab={screen.tab} level={xpToLevel(state.xp).lvl} />
            <TabPanel
              tabKey={screen.tab}
              direction={tabDirection(prevTabRef.current, screen.tab)}
            >
              {screen.tab === "home" && (
                <Home
                  onStartWorkout={(id) => setScreen({ kind: "workout", workoutId: id })}
                  onGoRoutine={() => setScreen({ kind: "tab", tab: "routine" })}
                  onOpenCheckin={() => setCheckinOpen(true)}
                />
              )}
              {screen.tab === "routine" && (
                <Routine
                  onStart={(id) => setScreen({ kind: "workout", workoutId: id })}
                  onCreateCustom={() => setScreen({ kind: "custom-new" })}
                  onOpenCustom={(id) => setScreen({ kind: "custom-view", id })}
                  onOpenCheckin={() => setCheckinOpen(true)}
                />
              )}
              {screen.tab === "coach" && (
                <CoachChat
                  onGoDiet={() => {
                    setDietStartWizard(true);
                    setScreen({ kind: "tab", tab: "diet" });
                  }}
                />
              )}
              {screen.tab === "diet" && (
                <DietSection
                  startWizard={dietStartWizard}
                  onWizardOpened={() => setDietStartWizard(false)}
                />
              )}
              {screen.tab === "history" && (
                <>
                  <ProgressCharts />
                  <History />
                </>
              )}
              {screen.tab === "profile" && (
                <Profile
                  onReset={() => {
                    if (confirm("Â¿Reiniciar toda tu data? Esta acciÃ³n no se puede deshacer.")) {
                      resetAll();
                      setScreen({ kind: "onboarding" });
                    }
                  }}
                  onRegen={() => {
                    if (!state.answers) return;
                    const routine = generateRoutine(state.answers);
                    setState((s) => ({ ...s, routine }));
                    showToast("Rutina regenerada");
                  }}
                  onCreateCustom={() => setScreen({ kind: "custom-new" })}
                  onOpenCustom={(id) => setScreen({ kind: "custom-view", id })}
                  email={user.email ?? ""}
                  onSignOut={async () => {
                    if (confirm("Â¿Cerrar sesiÃ³n?")) {
                      await handleSignOut();
                    }
                  }}
                />
              )}
            </TabPanel>
            <PremiumNav
              tab={screen.tab}
              prevTabRef={prevTabRef}
              onChange={(t) => setScreen({ kind: "tab", tab: t })}
            />
          </>
        )}

        <AnimatePresence>
          {screen.kind === "workout" && (
            <WorkoutScreen
              key="workout"
              workoutId={screen.workoutId}
              onExit={() => setScreen({ kind: "tab", tab: "home" })}
              onComplete={(msg) => {
                showToast(msg);
                setScreen({ kind: "tab", tab: "home" });
              }}
            />
          )}
        </AnimatePresence>

        {screen.kind === "custom-new" && (
          <CustomRoutineEditor
            onClose={() => setScreen({ kind: "tab", tab: "routine" })}
            onSaved={(msg) => {
              showToast(msg);
              setScreen({ kind: "tab", tab: "routine" });
            }}
          />
        )}

        {screen.kind === "custom-edit" && (() => {
          const r = state.customRoutines.find((x) => x.id === screen.id);
          if (!r) {
            setScreen({ kind: "tab", tab: "routine" });
            return null;
          }
          return (
            <CustomRoutineEditor
              initial={r}
              onClose={() => setScreen({ kind: "custom-view", id: r.id })}
              onSaved={(msg) => {
                showToast(msg);
                setScreen({ kind: "custom-view", id: r.id });
              }}
            />
          );
        })()}

        {screen.kind === "custom-view" && (() => {
          const r = state.customRoutines.find((x) => x.id === screen.id);
          if (!r) {
            setScreen({ kind: "tab", tab: "routine" });
            return null;
          }
          return (
            <CustomRoutineView
              routine={r}
              onClose={() => setScreen({ kind: "tab", tab: "routine" })}
              onEdit={() => setScreen({ kind: "custom-edit", id: r.id })}
              onDuplicate={() => {
                const now = new Date().toISOString();
                const copy: CustomRoutine = {
                  ...JSON.parse(JSON.stringify(r)),
                  id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
                  name: `${r.name} (copia)`,
                  createdAt: now,
                  updatedAt: now,
                };
                setState((s) => ({ ...s, customRoutines: [copy, ...s.customRoutines] }));
                showToast("Rutina duplicada");
                setScreen({ kind: "custom-view", id: copy.id });
              }}
              onDelete={() => {
                if (!confirm(`Â¿Eliminar "${r.name}"? Esta acciÃ³n no se puede deshacer.`)) return;
                setState((s) => ({
                  ...s,
                  customRoutines: s.customRoutines.filter((x) => x.id !== r.id),
                }));
                showToast("Rutina eliminada");
                setScreen({ kind: "tab", tab: "routine" });
              }}
            />
          );
        })()}

        <AnimatePresence>{toast && <PremiumToast message={toast} />}</AnimatePresence>
      </div>
    </div>
  );
}

/* ---------------- ONBOARDING ---------------- */
const ONB_STEPS = 10;

function Onboarding({ onDone }: { onDone: (a: OnboardingAnswers) => void }) {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Partial<OnboardingAnswers>>({
    daysPerWeek: 4,
    sessionLength: 45,
    age: 25,
    weight: 70,
    injuries: "",
  });

  function next() {
    if (step < ONB_STEPS - 1) setStep(step + 1);
    else onDone(a as OnboardingAnswers);
  }
  function back() {
    if (step > 0) setStep(step - 1);
  }
  function setField<K extends keyof OnboardingAnswers>(k: K, v: OnboardingAnswers[K]) {
    setA((prev) => ({ ...prev, [k]: v }));
  }

  const canNext = (() => {
    switch (step) {
      case 0: return !!a.name && a.name.trim().length > 0;
      case 1: return !!a.goal;
      case 2: return !!a.level;
      case 3: return !!a.daysPerWeek;
      case 4: return !!a.sessionLength;
      case 5: return !!a.equipment;
      case 6: return !!a.focusArea;
      case 7: return typeof a.age === "number" && a.age > 0;
      case 8: return typeof a.weight === "number" && a.weight > 0;
      case 9: return true;
      default: return true;
    }
  })();

  return (
    <>
      <header className="hdr">
        <div className="brand-row">
          <img src={gainzLogo} alt="GainZ" className="brand-logo" />
          <h1 className="htitle">GAINZ</h1>
        </div>
        <div className="tag mono">{step + 1}/{ONB_STEPS}</div>
      </header>
      <div className="body">
        <SpringProgress value={((step + 1) / ONB_STEPS) * 100} />

        <OnboardingStep step={step}>
        {step === 0 && (
          <Q title="Â¿CÃ“MO TE LLAMÃS?" subtitle="Para personalizar tu experiencia">
            <input
              autoFocus
              placeholder="Tu nombre"
              value={a.name || ""}
              onChange={(e) => setField("name", e.target.value)}
            />
          </Q>
        )}

        {step === 1 && (
          <Q title="Â¿CUÃL ES TU OBJETIVO?">
            <OptList
              value={a.goal}
              onChange={(v) => setField("goal", v as OnboardingAnswers["goal"])}
              options={[
                { v: "strength", l: "Ganar fuerza" },
                { v: "muscle", l: "Ganar mÃºsculo" },
                { v: "fat_loss", l: "Perder grasa" },
                { v: "endurance", l: "Resistencia" },
              ]}
            />
          </Q>
        )}

        {step === 2 && (
          <Q title="Â¿TU NIVEL?">
            <OptList
              value={a.level}
              onChange={(v) => setField("level", v as OnboardingAnswers["level"])}
              options={[
                { v: "beginner", l: "Principiante" },
                { v: "intermediate", l: "Intermedio" },
                { v: "advanced", l: "Avanzado" },
              ]}
            />
          </Q>
        )}

        {step === 3 && (
          <Q title="Â¿CUÃNTOS DÃAS POR SEMANA?">
            <div className="g2">
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  className={`opt-btn ${a.daysPerWeek === n ? "sel" : ""}`}
                  onClick={() => setField("daysPerWeek", n)}
                  style={{ textAlign: "center", fontSize: 22 }}
                >
                  {n} dÃ­as
                </button>
              ))}
            </div>
          </Q>
        )}

        {step === 4 && (
          <Q title="Â¿DURACIÃ“N POR SESIÃ“N?">
            <OptList
              value={a.sessionLength}
              onChange={(v) => setField("sessionLength", Number(v) as 30 | 45 | 60)}
              options={[
                { v: 30, l: "30 minutos" },
                { v: 45, l: "45 minutos" },
                { v: 60, l: "60 minutos" },
              ]}
            />
          </Q>
        )}

        {step === 5 && (
          <Q title="Â¿QUÃ‰ EQUIPO TENÃ‰S?">
            <OptList
              value={a.equipment}
              onChange={(v) => setField("equipment", v as OnboardingAnswers["equipment"])}
              options={[
                { v: "none", l: "Solo peso corporal" },
                { v: "dumbbells", l: "Mancuernas en casa" },
                { v: "full_gym", l: "Gimnasio completo" },
              ]}
            />
          </Q>
        )}

        {step === 6 && (
          <Q title="Â¿EN QUÃ‰ QUERÃ‰S FOCO?">
            <OptList
              value={a.focusArea}
              onChange={(v) => setField("focusArea", v as OnboardingAnswers["focusArea"])}
              options={[
                { v: "full", l: "Cuerpo completo" },
                { v: "upper", l: "Tren superior" },
                { v: "lower", l: "Tren inferior" },
                { v: "core", l: "Core / Abs" },
              ]}
            />
          </Q>
        )}

        {step === 7 && (
          <Q title="Â¿TU EDAD?">
            <input
              type="number"
              inputMode="numeric"
              value={a.age ?? ""}
              onChange={(e) => setField("age", Number(e.target.value))}
            />
          </Q>
        )}

        {step === 8 && (
          <Q title="Â¿TU PESO ACTUAL?" subtitle="En kilogramos">
            <input
              type="number"
              inputMode="decimal"
              value={a.weight ?? ""}
              onChange={(e) => setField("weight", Number(e.target.value))}
            />
          </Q>
        )}

        {step === 9 && (
          <Q title="Â¿LESIONES O LIMITACIONES?" subtitle="Opcional â€” para ajustar tu rutina">
            <textarea
              placeholder="Ej: dolor de rodilla, hombro... (o dejÃ¡ vacÃ­o)"
              value={a.injuries || ""}
              onChange={(e) => setField("injuries", e.target.value)}
            />
          </Q>
        )}

        </OnboardingStep>

        <div className="row" style={{ marginTop: "auto", paddingTop: 12 }}>
          {step > 0 && (
            <button className="btnO" onClick={back} style={{ flex: 1 }}>â† AtrÃ¡s</button>
          )}
          <button className="btn" onClick={next} disabled={!canNext} style={{ flex: 2 }}>
            {step === ONB_STEPS - 1 ? "Generar rutina âš¡" : "Siguiente â†’"}
          </button>
        </div>
      </div>
    </>
  );
}

function Q({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: 1, lineHeight: 1.1 }}>{title}</h2>
        {subtitle && <p className="label-sm" style={{ marginTop: 6 }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function OptList<V extends string | number>({
  value, onChange, options,
}: {
  value: V | undefined;
  onChange: (v: V) => void;
  options: { v: V; l: string }[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {options.map((o) => (
        <button
          key={String(o.v)}
          className={`opt-btn ${value === o.v ? "sel" : ""}`}
          onClick={() => onChange(o.v)}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

/* ---------------- GENERATING ---------------- */
function Generating() {
  return (
    <div className="body body-generating">
      <motion.div
        className="generating-inner"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="spin" />
        <div className="tag" style={{ marginTop: 24 }}>GENERANDO</div>
        <h2 className="generating-title">TU RUTINA PERSONALIZADA</h2>
        <p className="label-sm generating-sub">Ajustando ejercicios a tu nivel…</p>
        <div style={{ width: "100%", maxWidth: 240, marginTop: 20 }}>
          <SpringProgress value={72} />
        </div>
      </motion.div>
    </div>
  );
}

/* ---------------- HOME ---------------- */
function Home({ onStartWorkout, onGoRoutine, onOpenCheckin }: { onStartWorkout: (id: string) => void; onGoRoutine: () => void; onOpenCheckin: () => void }) {
  const s = useForge();
  const lvlInfo = xpToLevel(s.xp);
  const today = todayISO();
  const nextWorkout = pickNextWorkout(s.routine, s.history.map((h) => h.workoutName));
  const { data: checkin } = useTodayCheckin();
  const { data: override } = useTodayOverride(nextWorkout?.id ?? null);

  const adaptBadges = useMemo((): AdaptationBadgeId[] => {
    if (!override) return [];
    const badges: AdaptationBadgeId[] = ["adaptado"];
    const r = (override.reasoning ?? "").toLowerCase();
    if (r.includes("rodilla")) badges.push("seguro-rodilla");
    if (r.includes("hombro")) badges.push("seguro-hombro");
    if (r.includes("lumbar")) badges.push("seguro-lumbar");
    if (r.includes("carga") || r.includes("intensidad")) badges.push("baja-carga");
    return [...new Set(badges)];
  }, [override]);

  return (
    <Stagger>
      <StaggerItem>
        <div className="card hero-card">
          <p className="hero-greeting">{greetingForHour()}</p>
          <h2 className="hero-name">{s.answers?.name?.toUpperCase() || "ATLETA"}</h2>
          <p className="hero-sub">
            {s.streak > 0 ? `${s.streak} dÃ­as de racha activa` : "Hoy es un buen dÃ­a para entrenar"}
          </p>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="cardA xp-card">
          <div className="row" style={{ gap: 14, alignItems: "center" }}>
            <LevelBadge xp={s.xp} size={72} showLabel={false} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="label-sm">EXPERIENCIA</span>
                <span className="mono stat-accent">
                  LVL {lvlInfo.lvl} Â· {tierForXp(s.xp).tier.name}
                </span>
              </div>
              <div className="mono xp-count">
                {s.xp} <span className="xp-denom">/ {lvlInfo.nextXp} XP</span>
              </div>
              <SpringProgress value={Math.min(100, lvlInfo.progress * 100)} />
            </div>
          </div>
          <div className="label-sm" style={{ marginTop: 10 }}>
            {lvlInfo.toNext > 0 ? `${lvlInfo.toNext} XP para nivel ${lvlInfo.lvl + 1}` : "Nivel mÃ¡ximo"}
          </div>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="g2">
          <div className="card stat-card">
            <div className="stat-num">{s.streak}</div>
            <div className="stat-lbl">Racha dÃ­as</div>
          </div>
          <div className="card stat-card">
            <div className="stat-num">{s.workouts}</div>
            <div className="stat-lbl">Entrenos</div>
          </div>
        </div>
      </StaggerItem>

      {nextWorkout && (
        <StaggerItem>
          <div className={`cardG workout-hero ${override ? "card-adapted" : ""}`}>
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <span className="tagG">{override ? "RUTINA ADAPTADA" : "SIGUIENTE"}</span>
              <span className="label-sm">{nextWorkout.exercises.length} ejercicios</span>
            </div>
            {override && (
              <>
                <ForgeBadgeRow badges={adaptBadges} className="mt-8" />
                <p className="adapt-msg">{override.reasoning}</p>
              </>
            )}
            <h3 className="workout-hero-title">{nextWorkout.focus}</h3>
            <p className="label-sm" style={{ marginTop: 4 }}>{nextWorkout.name}</p>
          </div>
        </StaggerItem>
      )}

      {nextWorkout && (
        <StaggerItem>
          <PressableBtn className="btn btn-cta" onClick={() => onStartWorkout(nextWorkout.id)}>
            â–¶ Empezar entrenamiento
          </PressableBtn>
        </StaggerItem>
      )}

      <StaggerItem>
        <PressableBtn className="btnO" onClick={onGoRoutine}>Ver rutina completa</PressableBtn>
      </StaggerItem>

      <StaggerItem>
        <PressableBtn className="btnX checkin-btn" onClick={onOpenCheckin}>
          {checkin ? `âœ“ Check-in de hoy (${checkin.pain_areas.length || "sin dolor"})` : "ðŸ©º Check-in de hoy"}
        </PressableBtn>
      </StaggerItem>

      {s.lastWorkoutDate === today && (
        <StaggerItem>
          <div className="card card-done-today">
            <span className="tagG">âœ“ HOY YA ENTRENASTE</span>
          </div>
        </StaggerItem>
      )}
    </Stagger>
  );
}

function pickNextWorkout(routine: Workout[], history: string[]): Workout | null {
  if (routine.length === 0) return null;
  // Find the workout least recently done
  const last = history.slice(-routine.length);
  for (const w of routine) {
    if (!last.includes(w.name)) return w;
  }
  return routine[0];
}

/* ---------------- DAILY CHECK-IN AUTO-OPEN ---------------- */
function CheckinAutoOpener({ onOpen }: { onOpen: () => void }) {
  const { data: checkin, isLoading } = useTodayCheckin();
  useEffect(() => {
    if (isLoading) return;
    if (checkin) return; // already did today
    const key = `gainz_checkin_prompted_${todayISO()}`;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    const t = setTimeout(onOpen, 600);
    return () => clearTimeout(t);
  }, [checkin, isLoading, onOpen]);
  return null;
}

/* ---------------- ONE-TIME CLOUD SEED OF LOCAL HISTORY ---------------- */
async function maybeSeedLogs(uid: string, seedFn: ReturnType<typeof useServerFn<typeof seedExerciseLogs>>) {
  if (typeof window === "undefined") return;
  const key = `gainz_seeded_${uid}`;
  if (localStorage.getItem(key)) return;
  try {
    const raw = localStorage.getItem("forge_state_v1");
    if (!raw) { localStorage.setItem(key, "1"); return; }
    const state = JSON.parse(raw);
    const eh = state?.exerciseHistory ?? {};
    const routine = state?.routine ?? [];
    // Build lookup exercise_id â†’ {name, group}
    const meta = new Map<string, { name: string; group: string }>();
    for (const w of routine) {
      for (const ex of w.exercises ?? []) {
        meta.set(ex.id, { name: ex.name, group: ex.group });
      }
    }
    const items: Array<{
      exercise_id: string; exercise_name: string; muscle_group: string;
      date: string; sets: Array<{ weight_kg: number | null; reps: number }>;
    }> = [];
    for (const [exId, h] of Object.entries(eh) as [string, { sets: { weight: number | null; reps: number; done: boolean }[]; date: string }][]) {
      const info = meta.get(exId) ?? { name: exId, group: "general" };
      const done = (h.sets ?? []).filter((s) => s.done);
      if (done.length === 0) continue;
      items.push({
        exercise_id: exId,
        exercise_name: info.name,
        muscle_group: info.group,
        date: h.date,
        sets: done.map((s) => ({ weight_kg: s.weight ?? null, reps: s.reps })),
      });
    }
    if (items.length > 0) {
      await seedFn({ data: { items: items.slice(0, 500) } });
    }
    localStorage.setItem(key, "1");
  } catch (e) {
    console.error("[gainz] seed logs error", e);
  }
}

/* ---------------- ROUTINE ---------------- */
function Routine({
  onStart,
  onCreateCustom,
  onOpenCustom,
  onOpenCheckin,
}: {
  onStart: (id: string) => void;
  onCreateCustom: () => void;
  onOpenCustom: (id: string) => void;
  onOpenCheckin: () => void;
}) {
  const s = useForge();
  const { data: checkin } = useTodayCheckin();
  return (
    <>
      <button className="btnX" onClick={onOpenCheckin} style={{ alignSelf: "flex-start" }}>
        {checkin ? `âœ“ Check-in hoy (${checkin.pain_areas.length || "sin dolor"})` : "ðŸ©º Check-in de hoy"}
      </button>
      {s.routine.length === 0 ? (
        <div className="card">Sin rutina generada. AndÃ¡ a Perfil â†’ Regenerar.</div>
      ) : (
        <>
          <div className="h-section">TU PLAN â€” {s.routine.length} DÃAS / SEMANA</div>
          {s.routine.map((w) => (
        <div className="card" key={w.id}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="tag">{w.name.toUpperCase()}</span>
            <span className="label-sm">{w.exercises.length} ejercicios</span>
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 900, marginTop: 10 }}>{w.focus}</h3>
          <ul style={{ listStyle: "none", padding: 0, marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            {w.exercises.map((ex, i) => (
              <li key={i} className="row label-sm" style={{ justifyContent: "space-between" }}>
                <span style={{ color: "var(--txt)", fontWeight: 600, fontSize: 14, textTransform: "none", letterSpacing: 0 }}>
                  {ex.name}
                </span>
                <span className="mono" style={{ fontSize: 12 }}>
                  {ex.sets}Ã—{ex.reps}{ex.weightKg ? ` Â· ${ex.weightKg}kg` : " Â· PC"}
                </span>
              </li>
            ))}
          </ul>
          <button className="btn" style={{ marginTop: 14 }} onClick={() => onStart(w.id)}>
            â–¶ Empezar
          </button>
        </div>
          ))}
        </>
      )}

      {s.customRoutines.length > 0 && (
        <>
          <div className="h-section" style={{ marginTop: 8 }}>
            MIS RUTINAS Â· {s.customRoutines.length}
          </div>
          {s.customRoutines.map((r) => (
            <button
              key={r.id}
              className="card cr-card"
              onClick={() => onOpenCustom(r.id)}
              type="button"
            >
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="tag">{r.days} dÃ­as</span>
                <span className="label-sm">{r.exercises.length} ejercicios</span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 900, marginTop: 8 }}>{r.name}</h3>
              {r.notes && (
                <p className="label-sm" style={{ marginTop: 4, textTransform: "none", letterSpacing: 0.3 }}>
                  {r.notes.length > 80 ? r.notes.slice(0, 80) + "â€¦" : r.notes}
                </p>
              )}
            </button>
          ))}
        </>
      )}

      <button className="cr-cta" onClick={onCreateCustom} type="button">
        <span className="cr-cta-plus">+</span>
        <span className="cr-cta-text">
          <span className="cr-cta-title">CREAR MI RUTINA</span>
          <span className="cr-cta-sub">DiseÃ±Ã¡ tu propio plan personalizado</span>
        </span>
      </button>
    </>
  );
}

/* ---------------- WORKOUT ---------------- */
function parseRepsTarget(reps: string): number {
  const m = reps.match(/(\d+)\s*-\s*(\d+)/);
  if (m) return Math.round((Number(m[1]) + Number(m[2])) / 2);
  const n = reps.match(/(\d+)/);
  return n ? Number(n[1]) : 10;
}

function WorkoutScreen({
  workoutId, onExit, onComplete,
}: {
  workoutId: string;
  onExit: () => void;
  onComplete: (msg: string) => void;
}) {
  const s = useForge();
  const baseWorkout = s.routine.find((w) => w.id === workoutId);
  const { data: override } = useTodayOverride(baseWorkout?.id ?? null);
  const workout = useMemo<Workout | undefined>(() => {
    if (!baseWorkout) return undefined;
    if (!override) return baseWorkout;
    return {
      ...baseWorkout,
      name: override.workout_name || baseWorkout.name,
      focus: override.focus || baseWorkout.focus,
      exercises: override.exercises.map((e) => ({
        id: e.id,
        name: e.name,
        group: e.group,
        sets: e.sets,
        reps: e.reps,
        rest: e.rest,
        weightKg: e.weightKg,
        tips: e.tips ?? [],
        videoUrl: e.videoUrl ?? "",
        isCompound: !!e.isCompound,
        xp: e.xp ?? 10,
      })) as Exercise[],
    } as Workout;
  }, [baseWorkout, override]);
  const logSets = useServerFn(logExerciseSets);
  const clearOverride = useServerFn(clearRoutineOverride);
  const qc = useQueryClient();

  // Logs por ejercicio: array de sets {weight, reps, done}
  const [logs, setLogs] = useState<Record<string, SetLog[]>>(() => {
    if (!workout) return {};
    const out: Record<string, SetLog[]> = {};
    for (const ex of workout.exercises) {
      const prev = s.exerciseHistory[ex.id];
      const targetReps = parseRepsTarget(ex.reps);
      out[ex.id] = Array.from({ length: ex.sets }, (_, i) => {
        const prevSet = prev?.sets[i];
        return {
          weight: ex.weightKg === undefined ? null : (prevSet?.weight ?? ex.weightKg),
          reps: prevSet?.reps ?? targetReps,
          done: false,
        };
      });
    }
    return out;
  });
  const [openId, setOpenId] = useState<string | null>(workout?.exercises[0]?.id ?? null);
  const [resting, setResting] = useState<{ sec: number; total: number } | null>(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (!resting) return;
    if (resting.sec <= 0) { setResting(null); return; }
    const t = setTimeout(() => setResting({ sec: resting.sec - 1, total: resting.total }), 1000);
    return () => clearTimeout(t);
  }, [resting]);

  if (!workout) {
    return (
      <>
        <header className="hdr">
          <button className="btnX" onClick={onExit}>âœ• Salir</button>
        </header>
        <div className="body"><div className="card">Workout no encontrado.</div></div>
      </>
    );
  }

  const exerciseDone = (ex: Exercise) => logs[ex.id]?.every(s => s.done) ?? false;
  const doneCount = workout.exercises.filter(exerciseDone).length;
  const allDone = doneCount === workout.exercises.length;
  const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const doneSets = workout.exercises.reduce(
    (sum, ex) => sum + (logs[ex.id]?.filter(s => s.done).length ?? 0),
    0
  );

  function updateSet(exId: string, setIdx: number, patch: Partial<SetLog>) {
    setLogs(prev => {
      const arr = [...(prev[exId] ?? [])];
      arr[setIdx] = { ...arr[setIdx], ...patch };
      return { ...prev, [exId]: arr };
    });
  }

  function toggleSet(ex: Exercise, setIdx: number) {
    const cur = logs[ex.id][setIdx];
    const wasDone = cur.done;
    updateSet(ex.id, setIdx, { done: !wasDone });
    if (!wasDone) {
      // Ãºltimo set marcado â†’ abrir siguiente ejercicio
      const updated = logs[ex.id].map((s, i) => i === setIdx ? { ...s, done: true } : s);
      const exComplete = updated.every(s => s.done);
      if (exComplete) {
        const idx = workout!.exercises.findIndex(e => e.id === ex.id);
        const next = workout!.exercises[idx + 1];
        if (next) setOpenId(next.id);
      } else {
        setResting({ sec: ex.rest, total: ex.rest });
      }
    }
  }

  function finish() {
    let exercisesDone = 0;
    let xpGained = 0;
    const newHistory: Record<string, { sets: SetLog[]; date: string }> = {};
    const today = todayISO();
    const cloudSets: Array<{
      exercise_id: string; exercise_name: string; muscle_group: string;
      workout_id: string | null; workout_name: string | null;
      date: string; set_index: number; weight_kg: number | null; reps: number;
    }> = [];

    for (const ex of workout!.exercises) {
      const sets = logs[ex.id] ?? [];
      const completedSets = sets.filter(s => s.done).length;
      if (completedSets > 0) {
        exercisesDone++;
        // XP proporcional a series completadas
        xpGained += Math.round((ex.xp * completedSets) / ex.sets);
        newHistory[ex.id] = { sets: sets.map(s => ({ ...s })), date: today };
        sets.forEach((st, idx) => {
          if (!st.done) return;
          cloudSets.push({
            exercise_id: ex.id,
            exercise_name: ex.name,
            muscle_group: ex.group,
            workout_id: workout!.id,
            workout_name: workout!.name,
            date: today,
            set_index: idx,
            weight_kg: st.weight ?? null,
            reps: st.reps,
          });
        });
      }
    }

    const durationSec = Math.round((Date.now() - startRef.current) / 1000);

    setState((st) => {
      const lastDate = st.lastWorkoutDate;
      let newStreak = st.streak;
      if (lastDate === today) {
        // ya contÃ³ hoy
      } else if (lastDate && daysBetween(lastDate, today) === 1) {
        newStreak = st.streak + 1;
      } else {
        newStreak = 1;
      }
      const newXp = st.xp + xpGained;
      const newTotalEx = st.totalExercises + exercisesDone;
      const newWorkouts = st.workouts + 1;
      const newAch = ACHIEVEMENTS.filter((a) =>
        a.check({ workouts: newWorkouts, streak: newStreak, xp: newXp, totalExercises: newTotalEx })
      ).map((a) => a.id);
      return {
        ...st,
        xp: newXp,
        streak: newStreak,
        lastWorkoutDate: today,
        workouts: newWorkouts,
        totalExercises: newTotalEx,
        history: [
          {
            date: today,
            workoutName: workout!.name,
            focus: workout!.focus,
            exercisesDone,
            totalExercises: workout!.exercises.length,
            xpGained,
            durationSec,
          },
          ...st.history,
        ].slice(0, 50),
        achievements: Array.from(new Set([...st.achievements, ...newAch])),
        exerciseHistory: { ...st.exerciseHistory, ...newHistory },
      };
    });

    onComplete(`+${xpGained} XP ganado âš¡`);

    // Background: persist sets to cloud + clear today's override
    if (cloudSets.length > 0) {
      logSets({ data: { sets: cloudSets } })
        .then(() => qc.invalidateQueries({ queryKey: ["exercise-logs"] }))
        .catch((e) => console.error("[gainz] logExerciseSets", e));
    }
    if (override && baseWorkout) {
      clearOverride({ data: { date: today, workout_id: baseWorkout.id } })
        .then(() => qc.invalidateQueries({ queryKey: ["routine-override", today, baseWorkout.id] }))
        .catch(() => {});
    }
  }

  const anyDone = Object.values(logs).some(arr => arr.some(s => s.done));

  const progressPct = totalSets ? doneSets / totalSets : 0;

  return (
    <WorkoutShell>
      <header className="hdr hdr-workout">
        <PressableBtn className="btnX" onClick={() => {
          if (!anyDone || confirm("Â¿Salir? PerderÃ¡s el progreso.")) onExit();
        }}>âœ• Salir</PressableBtn>
        <div className="workout-hdr-progress">
          <RingProgress value={progressPct} size={44} />
          <span className="mono workout-hdr-label">
            {doneSets}/{totalSets}
          </span>
        </div>
      </header>

      <main className="body body-workout">
        {override && (
          <div className="card card-adapted">
            <div className="label-sm" style={{ color: "var(--acc)" }}>RUTINA ADAPTADA</div>
            <ForgeBadgeRow badges={(() => {
              const badges: AdaptationBadgeId[] = ["adaptado"];
              const r = (override.reasoning ?? "").toLowerCase();
              if (r.includes("rodilla")) badges.push("seguro-rodilla");
              if (r.includes("hombro")) badges.push("seguro-hombro");
              if (r.includes("lumbar")) badges.push("seguro-lumbar");
              if (r.includes("carga")) badges.push("baja-carga");
              return badges;
            })()} className="mt-8" />
            <p className="adapt-msg">{override.reasoning}</p>
          </div>
        )}
        <div className="cardA workout-summary">
          <span className="tag">{workout.focus}</span>
          <h2 className="workout-title">{workout.name}</h2>
          <div className="row mono label-sm workout-meta">
            <span>EJERCICIOS {doneCount}/{workout.exercises.length}</span>
            <span>SERIES {doneSets}/{totalSets}</span>
          </div>
          <SpringProgress value={progressPct * 100} />
        </div>

        {workout.exercises.map((ex) => {
          const done = exerciseDone(ex);
          const open = openId === ex.id;
          const setsLog = logs[ex.id] ?? [];
          const doneSetsEx = setsLog.filter(s => s.done).length;
          return (
            <ExerciseCard
              key={ex.id}
              id={ex.id}
              open={open}
              done={done}
              onToggle={() => setOpenId(open ? null : ex.id)}
              header={
                <>
                  <div className={`check ${done ? "on" : ""}`}>{done ? "âœ“" : "â€¢"}</div>
                  <div className="ex-card-info">
                    <div className="ex-card-name">{ex.name}</div>
                    <div className="label-sm mono ex-card-meta">
                      {ex.sets}Ã—{ex.reps}{ex.weightKg ? ` Â· ${ex.weightKg}kg` : " Â· PC"} Â· {ex.rest}s
                    </div>
                    <span className={`ex-progress ${doneSetsEx === ex.sets ? "full" : ""}`}>
                      {doneSetsEx}/{ex.sets} series
                    </span>
                  </div>
                </>
              }
            >
              <div className="tips-box">
                <div className="label-sm tips-label">ðŸ’¡ TÃ‰CNICA</div>
                <ul>
                  {ex.tips.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
              <a
                href={ex.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btnO video-link"
              >
                â–¶ Ver video explicativo
              </a>
              <div className="set-stack">
                {setsLog.map((set, i) => (
                  <AnimatedSetBlock
                    key={i}
                    index={i}
                    total={ex.sets}
                    targetReps={ex.reps}
                    hasWeight={ex.weightKg !== undefined}
                    set={set}
                    onChange={(patch) => updateSet(ex.id, i, patch)}
                    onToggle={() => toggleSet(ex, i)}
                  />
                ))}
              </div>
            </ExerciseCard>
          );
        })}

        {anyDone && (
          <div className="bottom-bar">
            {allDone ? (
              <PressableBtn className="btnG" onClick={finish}>âœ“ Finalizar entrenamiento</PressableBtn>
            ) : (
              <PressableBtn className="btnO" onClick={finish}>
                Finalizar parcial Â· {doneSets}/{totalSets} series
              </PressableBtn>
            )}
          </div>
        )}
      </main>

      <AnimatePresence>
        {resting && (
          <RestOverlay
            seconds={resting.sec}
            total={resting.total}
            onSkip={() => setResting(null)}
          />
        )}
      </AnimatePresence>
    </WorkoutShell>
  );
}

/* ---------------- HISTORY ---------------- */
function History() {
  const s = useForge();
  if (s.history.length === 0) {
    return <div className="card"><p className="label-sm">Sin entrenamientos todavÃ­a. EmpezÃ¡ tu primer workout.</p></div>;
  }
  return (
    <>
      <div className="h-section">ÃšLTIMAS {s.history.length} SESIONES</div>
      {s.history.map((h, i) => (
        <div className="card" key={i}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="tag">{h.focus}</span>
            <span className="mono label-sm">{h.date}</span>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 900, marginTop: 8 }}>{h.workoutName}</h3>
          <div className="row mono label-sm" style={{ marginTop: 8, gap: 16 }}>
            <span>{h.exercisesDone}/{h.totalExercises} ej</span>
            <span>+{h.xpGained} XP</span>
            <span>{Math.floor(h.durationSec / 60)}m {h.durationSec % 60}s</span>
          </div>
        </div>
      ))}
    </>
  );
}

/* ---------------- ACHIEVEMENTS ---------------- */
function Achievements() {
  const s = useForge();
  const unlocked = useMemo(() =>
    ACHIEVEMENTS.filter((a) =>
      a.check({ workouts: s.workouts, streak: s.streak, xp: s.xp, totalExercises: s.totalExercises })
    ).map((a) => a.id),
    [s.workouts, s.streak, s.xp, s.totalExercises]
  );
  return (
    <>
      <div className="h-section">DESBLOQUEADOS {unlocked.length} / {ACHIEVEMENTS.length}</div>
      {ACHIEVEMENTS.map((a) => {
        const open = unlocked.includes(a.id);
        return (
          <div className={open ? "cardG" : "card ach-locked"} key={a.id}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className={open ? "tagG" : "tagD"}>{open ? "âœ“ DESBLOQUEADO" : "BLOQUEADO"}</span>
              {open && <span style={{ fontSize: 22 }}>â˜…</span>}
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 900, marginTop: 8 }}>{a.name}</h3>
            <p className="label-sm" style={{ marginTop: 4, letterSpacing: 0.5, textTransform: "none" }}>{a.desc}</p>
          </div>
        );
      })}
    </>
  );
}

/* ---------------- PROFILE ---------------- */
function Profile({
  onReset,
  onRegen,
  onCreateCustom,
  onOpenCustom,
  email,
  onSignOut,
}: {
  onReset: () => void;
  onRegen: () => void;
  onCreateCustom: () => void;
  onOpenCustom: (id: string) => void;
  email: string;
  onSignOut: () => void;
}) {
  const s = useForge();
  const a = s.answers;
  if (!a) return <div className="card">Sin datos.</div>;
  const labels: Record<string, string> = {
    strength: "Fuerza", muscle: "MÃºsculo", fat_loss: "PÃ©rdida grasa", endurance: "Resistencia",
    beginner: "Principiante", intermediate: "Intermedio", advanced: "Avanzado",
    none: "Peso corporal", dumbbells: "Mancuernas", full_gym: "Gym completo",
    full: "Cuerpo completo", upper: "Tren superior", lower: "Tren inferior", core: "Core",
  };
  return (
    <>
      <div className="cardA">
        <div className="label-sm" style={{ textAlign: "center" }}>PERFIL</div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
          <AvatarEditor name={a.name} />
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 900, marginTop: 12, textAlign: "center" }}>
          {a.name.toUpperCase()}
        </h2>
        <div
          className="row mono label-sm"
          style={{ marginTop: 6, gap: 16, justifyContent: "center" }}
        >
          <span>{a.age} aÃ±os</span>
          <span>{a.weight} kg</span>
        </div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div className="label-sm">RANGO ACTUAL</div>
        <LevelBadge xp={s.xp} size={140} />
        <div className="mono" style={{ fontSize: 13, color: "var(--muted-c)", textAlign: "center" }}>
          {(() => {
            const info = xpToLevel(s.xp);
            const { next } = tierForXp(s.xp);
            if (info.toNext <= 0) return "RANGO MÃXIMO ALCANZADO";
            return `${info.toNext} XP para nivel ${info.lvl + 1}${next ? ` Â· prÃ³ximo rango: ${next.name}` : ""}`;
          })()}
        </div>
        <div className="xpw" style={{ width: "100%" }}>
          <div className="xpf" style={{ width: `${Math.min(100, xpToLevel(s.xp).progress * 100)}%` }} />
        </div>
      </div>

      <div className="card">
        <div className="h-section">CONFIGURACIÃ“N</div>
        <Row k="Objetivo" v={labels[a.goal] || a.goal} />
        <Row k="Nivel" v={labels[a.level] || a.level} />
        <Row k="DÃ­as / semana" v={String(a.daysPerWeek)} />
        <Row k="DuraciÃ³n" v={`${a.sessionLength} min`} />
        <Row k="Equipo" v={labels[a.equipment] || a.equipment} />
        <Row k="Foco" v={labels[a.focusArea] || a.focusArea} />
        {a.injuries && <Row k="Lesiones" v={a.injuries} />}
      </div>

      <div className="card">
        <div className="h-section">ESTADÃSTICAS</div>
        <Row k="XP total" v={String(s.xp)} />
        <Row k="Entrenamientos" v={String(s.workouts)} />
        <Row k="Racha actual" v={`${s.streak} dÃ­as`} />
        <Row k="Ejercicios" v={String(s.totalExercises)} />
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="h-section" style={{ margin: 0 }}>
            MIS RUTINAS Â· {s.customRoutines.length}
          </div>
          <button
            className="btnO"
            style={{ padding: "8px 12px", fontSize: 12 }}
            onClick={onCreateCustom}
            type="button"
          >
            + Nueva
          </button>
        </div>
        {s.customRoutines.length === 0 ? (
          <p className="label-sm" style={{ marginTop: 8, textTransform: "none", letterSpacing: 0.3 }}>
            AÃºn no creaste rutinas personalizadas.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {s.customRoutines.map((r) => (
              <button
                key={r.id}
                className="cr-row"
                onClick={() => onOpenCustom(r.id)}
                type="button"
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, textTransform: "uppercase" }}>
                    {r.name}
                  </div>
                  <div className="label-sm mono" style={{ marginTop: 3 }}>
                    {r.exercises.length} ej Â· {r.days} dÃ­as Â· {r.createdAt.slice(0, 10)}
                  </div>
                </div>
                <span style={{ opacity: 0.6, fontSize: 18 }}>â€º</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="btnO" onClick={onRegen}>â†» Regenerar rutina</button>
      <InstallPrompt />
      <div className="card" style={{ marginTop: 4 }}>
        <div className="h-section">CUENTA</div>
        <Row k="Email" v={email || "â€”"} />
        <button
          className="btnO"
          style={{ marginTop: 12 }}
          onClick={onSignOut}
          type="button"
        >
          âŽ‹ Cerrar sesiÃ³n
        </button>
      </div>
      <button className="btnX" onClick={onReset} style={{ marginTop: 4 }}>Reiniciar todo</button>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-c)" }}>
      <span className="label-sm">{k}</span>
      <span style={{ fontWeight: 700 }}>{v}</span>
    </div>
  );
}
