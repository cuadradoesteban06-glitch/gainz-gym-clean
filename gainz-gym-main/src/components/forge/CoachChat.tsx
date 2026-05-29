import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  chatWithCoach,
  getCoachMessages,
  clearCoachMessages,
  getProgressLogs,
  type CoachMessage,
  type ExerciseLog,
} from "@/lib/coach.functions";
import { useForge, todayISO } from "@/lib/forge-store";
import { useTodayCheckin } from "./DailyCheckin";
import { ForgeButton } from "./ui/ForgeButton";
import { ForgeCard } from "./ui/ForgeCard";
import { ChatBubble, ChatMessageContent } from "./ui/ChatBubble";
import { ChatSkeleton, TypingIndicator } from "./ui/TypingIndicator";
import { ForgeBadgeRow } from "./ui/ForgeBadge";
import type { AdaptationBadgeId } from "@/lib/design-tokens";

const SUGGESTED_PROMPTS = [
  "¿Cuánto volumen semanal necesito para hipertrofia?",
  "Tengo dolor de rodilla, ¿qué cambio en mi rutina?",
  "¿Cuánta proteína por kg de peso?",
];

const DIET_PROMPT = "Generá mi plan de dieta personalizado";

export default function CoachChat({ onGoDiet }: { onGoDiet?: () => void }) {
  const fetchMessages = useServerFn(getCoachMessages);
  const send = useServerFn(chatWithCoach);
  const clearAll = useServerFn(clearCoachMessages);
  const fetchLogs = useServerFn(getProgressLogs);
  const qc = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["coach-messages"],
    queryFn: () => fetchMessages(),
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["exercise-logs"],
    queryFn: () => fetchLogs(),
  });
  const { data: checkin } = useTodayCheckin();

  const state = useForge();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [actionBadges, setActionBadges] = useState<AdaptationBadgeId[]>([]);
  const [dietCta, setDietCta] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const todays_pain = useMemo(
    () => checkin?.pain_areas ?? [],
    [checkin]
  );

  const todays_workout = useMemo(() => {
    const dow = new Date().getDay();
    const idx = (dow + 6) % 7;
    const w = state.routine[idx % Math.max(1, state.routine.length)];
    if (!w) return null;
    return {
      id: w.id,
      name: w.name,
      focus: w.focus,
      exercises: w.exercises.map((e) => ({
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
      })),
    };
  }, [state.routine]);

  const recent_progress = useMemo(() => {
    return (logs as ExerciseLog[])
      .slice(-30)
      .reverse()
      .map((l) => ({
        exercise: l.exercise_name,
        date: l.date,
        weight_kg: l.weight_kg,
        reps: l.reps,
      }));
  }, [logs]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  async function handleSend() {
    const msg = input.trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);

    const optimistic: CoachMessage = {
      id: `tmp_${Date.now()}`,
      role: "user",
      content: msg,
      created_at: new Date().toISOString(),
    };
    qc.setQueryData<CoachMessage[]>(["coach-messages"], (old = []) => [...old, optimistic]);

    try {
      const res = await send({
        data: {
          message: msg,
          context_snapshot: {
            name: state.answers?.name,
            goal: state.answers?.goal,
            level: state.answers?.level,
            daysPerWeek: state.answers?.daysPerWeek,
            sessionLength: state.answers?.sessionLength,
            equipment: state.answers?.equipment,
            age: state.answers?.age,
            weight: state.answers?.weight,
            todays_workout,
            todays_pain,
            recent_progress,
          },
        },
      });
      if (res.actions && res.actions.length > 0) {
        setActionToast(res.actions.join(" · "));
        setActionBadges(res.badges ?? []);
        setTimeout(() => {
          setActionToast(null);
          setActionBadges([]);
        }, 4500);
      }
      if (res.navigate_to === "diet") {
        setDietCta(true);
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      setActionToast(`Error: ${err?.message ?? "no se pudo enviar"}`);
      setTimeout(() => setActionToast(null), 4000);
    } finally {
      setSending(false);
      qc.invalidateQueries({ queryKey: ["coach-messages"] });
      qc.invalidateQueries({ queryKey: ["routine-override", todayISO()] });
      qc.invalidateQueries({ queryKey: ["coach-profile"] });
    }
  }

  async function handleClear() {
    if (!confirm("¿Borrar el historial del coach?")) return;
    await clearAll();
    qc.setQueryData(["coach-messages"], []);
  }

  return (
    <div className="coach-wrap">
      <motion.div
        className="coach-head"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="coach-head-info">
          <div className="coach-avatar" aria-hidden>✦</div>
          <div>
            <div className="coach-title">Coach IA</div>
            <div className="coach-subtitle">
              Personalizado · basado en ciencia
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <ForgeButton variant="ghost" size="sm" onClick={handleClear}>
            Limpiar
          </ForgeButton>
        )}
      </motion.div>

      {todays_pain.length > 0 && (
        <ForgeCard variant="glass" className="coach-pain-banner">
          <div className="label-sm" style={{ color: "var(--acc)" }}>
            MOLESTIAS DE HOY
          </div>
          <p className="coach-pain-text">
            {todays_pain.map((p) => `${p.body_part} (${p.severity}/5)`).join(" · ")}
          </p>
          <p className="coach-pain-hint">
            El coach adaptará recomendaciones según tu check-in.
          </p>
        </ForgeCard>
      )}

      <div className="coach-scroll" ref={scrollRef}>
        {isLoading && <ChatSkeleton />}

        {!isLoading && messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ForgeCard className="coach-empty">
              <div className="label-sm" style={{ color: "var(--acc)" }}>
                EMPEZAR
              </div>
              <p className="coach-empty-text">
                Preguntame sobre técnica, volumen, descanso, nutrición o cómo
                adaptar tu rutina a una molestia. Aprendo de tus correcciones.
              </p>
              <div className="coach-prompts">
                {onGoDiet && (
                  <motion.button
                    type="button"
                    className="coach-prompt-btn coach-prompt-diet"
                    onClick={() => onGoDiet()}
                    whileTap={{ scale: 0.98 }}
                  >
                    {DIET_PROMPT}
                  </motion.button>
                )}
                {SUGGESTED_PROMPTS.map((q) => (
                  <motion.button
                    key={q}
                    type="button"
                    className="coach-prompt-btn"
                    onClick={() => setInput(q)}
                    whileTap={{ scale: 0.98 }}
                  >
                    {q}
                  </motion.button>
                ))}
              </div>
            </ForgeCard>
          </motion.div>
        )}

        {(messages as CoachMessage[]).map((m, i) => (
          <ChatBubble key={m.id} role={m.role === "user" ? "user" : "assistant"} index={i}>
            <ChatMessageContent content={m.content} />
          </ChatBubble>
        ))}

        <AnimatePresence>{sending && <TypingIndicator />}</AnimatePresence>
      </div>

      <AnimatePresence>
        {dietCta && onGoDiet && (
          <motion.div
            className="coach-diet-cta"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <p>¿Querés armar tu plan completo con el wizard de Dieta?</p>
            <div className="coach-diet-cta-actions">
              <ForgeButton variant="primary" size="sm" onClick={() => { setDietCta(false); onGoDiet(); }}>
                Ir al planificador
              </ForgeButton>
              <ForgeButton variant="ghost" size="sm" onClick={() => setDietCta(false)}>
                Ahora no
              </ForgeButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {actionToast && (
          <motion.div
            className="coach-toast-wrap"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <div className="coach-toast">{actionToast}</div>
            {actionBadges.length > 0 && <ForgeBadgeRow badges={actionBadges} />}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="coach-compose">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregúntale al coach…"
          rows={1}
          className="coach-input"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <motion.button
          type="button"
          className="coach-send-btn"
          disabled={!input.trim() || sending}
          onClick={handleSend}
          whileTap={{ scale: 0.92 }}
          aria-label="Enviar mensaje"
        >
          {sending ? (
            <span className="coach-send-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </motion.button>
      </div>
    </div>
  );
}
