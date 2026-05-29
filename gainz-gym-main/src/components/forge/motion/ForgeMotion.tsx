import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import {
  fadeUp,
  greetingForHour,
  hapticLight,
  hapticSuccess,
  springBounce,
  springSnappy,
  springSoft,
  staggerContainer,
  tabDirection,
  tabPanelVariants,
  toastTransition,
} from "@/lib/motion";
import gainzLogo from "@/assets/gainz-logo.png";

const easeOutArr = [0.22, 1, 0.36, 1] as const;

/* ─── Tab panel with directional slide ─── */
export function TabPanel({
  tabKey,
  direction,
  children,
  className = "body",
}: {
  tabKey: string;
  direction: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main
        key={tabKey}
        className={className}
        variants={tabPanelVariants(direction)}
        initial="enter"
        animate="center"
        exit="exit"
      >
        {children}
      </motion.main>
    </AnimatePresence>
  );
}

export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className ?? "stagger-list"}
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  );
}

export function SpringProgress({ value, className = "xpw" }: { value: number; className?: string }) {
  const spring = useSpring(0, springSoft);
  useEffect(() => {
    spring.set(Math.min(100, Math.max(0, value)));
  }, [value, spring]);
  const width = useTransform(spring, (v) => `${v}%`);
  return (
    <div className={className}>
      <motion.div className="xpf" style={{ width }} />
    </div>
  );
}

export function RingProgress({ value, size = 52 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const spring = useSpring(0, springSoft);
  useEffect(() => {
    spring.set(Math.min(1, Math.max(0, value)));
  }, [value, spring]);
  const offset = useTransform(spring, (v) => circ * (1 - v));
  return (
    <svg width={size} height={size} className="ring-progress" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        className="ring-fill"
        strokeDasharray={circ}
        style={{ strokeDashoffset: offset }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

type TabId = "home" | "routine" | "coach" | "diet" | "history" | "profile";

const TAB_TITLES: Record<TabId, string> = {
  home: "GAINZ",
  routine: "RUTINA",
  coach: "COACH IA",
  diet: "DIETA",
  history: "PROGRESO",
  profile: "PERFIL",
};

export function PremiumHeader({ tab, level }: { tab: TabId; level: number }) {
  return (
    <header className="hdr hdr-premium">
      <div className="brand-row">
        <AnimatePresence mode="wait">
          {tab === "home" && (
            <motion.img
              key="logo"
              src={gainzLogo}
              alt="GainZ"
              className="brand-logo"
              initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={springSnappy}
            />
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.h1
            key={tab}
            className="htitle"
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
            transition={{ duration: 0.22 }}
          >
            {TAB_TITLES[tab]}
          </motion.h1>
        </AnimatePresence>
      </div>
      <motion.div className="tag tag-lvl" whileTap={{ scale: 0.94 }} transition={springSnappy}>
        LVL {level}
      </motion.div>
    </header>
  );
}

const NAV_ITEMS: { id: TabId; label: string; ico: string; center?: boolean }[] = [
  { id: "home", label: "Inicio", ico: "⌂" },
  { id: "routine", label: "Rutina", ico: "≡" },
  { id: "coach", label: "Coach", ico: "✦", center: true },
  { id: "diet", label: "Dieta", ico: "◆" },
  { id: "history", label: "Stats", ico: "◎" },
  { id: "profile", label: "Perfil", ico: "◉" },
];

export function PremiumNav({
  tab,
  onChange,
  prevTabRef,
}: {
  tab: TabId;
  onChange: (t: TabId) => void;
  prevTabRef: React.MutableRefObject<TabId>;
}) {
  return (
    <nav className="nav nav-premium" role="tablist">
      {NAV_ITEMS.map((it) => {
        const active = tab === it.id;
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={active}
            className={`ni ${active ? "on" : ""} ${it.center ? "ni-center" : ""}`}
            onClick={() => {
              if (it.id !== tab) {
                hapticLight();
                prevTabRef.current = tab;
                onChange(it.id);
              }
            }}
          >
            {active && (
              <motion.span
                layoutId={it.center ? "nav-pill-center" : "nav-pill"}
                className={it.center ? "ni-pill ni-pill-center" : "ni-pill"}
                transition={springSnappy}
              />
            )}
            <motion.span
              className="ni-ico"
              animate={active ? { scale: 1.12, y: -1 } : { scale: 1, y: 0 }}
              transition={springSnappy}
            >
              {it.ico}
            </motion.span>
            <span className="ni-label">{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export { tabDirection };

export function PremiumToast({ message }: { message: string }) {
  return (
    <motion.div
      className="toast toast-premium"
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.95 }}
      transition={toastTransition}
      role="status"
    >
      {message}
    </motion.div>
  );
}

export function AppBootLoader() {
  return (
    <div className="forge app-boot">
      <div className="app-shell app-boot-shell">
        <motion.div
          className="boot-logo-wrap"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springSoft}
        >
          <img src={gainzLogo} alt="" className="boot-logo" />
          <motion.div
            className="boot-bar"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.2, ease: easeOutArr }}
          />
        </motion.div>
      </div>
    </div>
  );
}

export function WorkoutShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="workout-shell"
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={springSoft}
    >
      {children}
    </motion.div>
  );
}

export function ExerciseCard({
  id,
  open,
  done,
  onToggle,
  header,
  children,
}: {
  id: string;
  open: boolean;
  done: boolean;
  onToggle: () => void;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      layout
      className={`card ex-card ${done ? "ex-card-done" : ""} ${open ? "ex-card-open" : ""}`}
      initial={false}
    >
      <motion.button type="button" className="ex-card-head" onClick={onToggle} whileTap={{ scale: 0.985 }}>
        {header}
        <motion.span className="ex-chevron" animate={{ rotate: open ? 180 : 0 }} transition={springSnappy}>
          ▾
        </motion.span>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key={`body-${id}`}
            className="ex-card-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: easeOutArr }}
          >
            <div className="ex-card-inner">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function AnimatedSetBlock({
  index,
  total,
  targetReps,
  hasWeight,
  set,
  onChange,
  onToggle,
}: {
  index: number;
  total: number;
  targetReps: string;
  hasWeight: boolean;
  set: { weight: number | null; reps: number; done: boolean };
  onChange: (patch: Partial<{ weight: number | null; reps: number; done: boolean }>) => void;
  onToggle: () => void;
}) {
  const wStep = 2.5;
  const w = set.weight ?? 0;
  const wasDone = useRef(set.done);

  useEffect(() => {
    if (set.done && !wasDone.current) hapticSuccess();
    wasDone.current = set.done;
  }, [set.done]);

  return (
    <motion.div
      className={`set-card ${set.done ? "set-done" : ""}`}
      layout
      initial={false}
      animate={set.done ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={springBounce}
    >
      <div className="set-head">
        <strong>SERIE {index + 1} / {total}</strong>
        <span>OBJ {targetReps} REPS</span>
      </div>
      <div className="row set-steppers">
        {hasWeight && (
          <div className="stepper">
            <div className="stepper-lbl">KG</div>
            <div className="stepper-row">
              <motion.button
                type="button"
                className="stepper-btn"
                whileTap={{ scale: 0.88 }}
                onClick={() => onChange({ weight: Math.max(0, Number((w - wStep).toFixed(2))) })}
              >
                −
              </motion.button>
              <input
                type="number"
                inputMode="decimal"
                value={set.weight ?? ""}
                onChange={(e) =>
                  onChange({ weight: e.target.value === "" ? null : Number(e.target.value) })
                }
                placeholder="0"
              />
              <motion.button
                type="button"
                className="stepper-btn"
                whileTap={{ scale: 0.88 }}
                onClick={() => onChange({ weight: Number((w + wStep).toFixed(2)) })}
              >
                +
              </motion.button>
            </div>
          </div>
        )}
        <div className="stepper">
          <div className="stepper-lbl">REPS</div>
          <div className="stepper-row">
            <motion.button
              type="button"
              className="stepper-btn"
              whileTap={{ scale: 0.88 }}
              onClick={() => onChange({ reps: Math.max(0, set.reps - 1) })}
            >
              −
            </motion.button>
            <input
              type="number"
              inputMode="numeric"
              value={set.reps}
              onChange={(e) => onChange({ reps: Number(e.target.value) || 0 })}
            />
            <motion.button
              type="button"
              className="stepper-btn"
              whileTap={{ scale: 0.88 }}
              onClick={() => onChange({ reps: set.reps + 1 })}
            >
              +
            </motion.button>
          </div>
        </div>
      </div>
      <motion.button
        type="button"
        onClick={onToggle}
        className={`set-done-btn ${set.done ? "is-done" : ""}`}
        whileTap={{ scale: 0.97 }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={set.done ? "done" : "pending"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {set.done ? "✓ SERIE HECHA" : "MARCAR COMO HECHA"}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
}

export function RestOverlay({
  seconds,
  total,
  onSkip,
}: {
  seconds: number;
  total: number;
  onSkip: () => void;
}) {
  const pct = total > 0 ? seconds / total : 0;
  return (
    <motion.div className="overlay overlay-rest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className="rest-card"
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={springSoft}
      >
        <div className="tag">DESCANSO</div>
        <div className="rest-ring-wrap">
          <RingProgress value={1 - pct} size={140} />
          <div className="timer-big mono rest-time">{String(seconds).padStart(2, "0")}</div>
        </div>
        <div className="label-sm">SEGUNDOS</div>
        <motion.button className="btnO rest-skip" onClick={onSkip} whileTap={{ scale: 0.96 }} type="button">
          Saltear descanso
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

export function OnboardingStep({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        className="onb-step"
        initial={{ opacity: 0, x: 32 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.28, ease: easeOutArr }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function PressableBtn({
  children,
  className = "btn",
  style,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      className={className}
      style={style}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.975 }}
      transition={springSnappy}
    >
      {children}
    </motion.button>
  );
}

export { greetingForHour };
