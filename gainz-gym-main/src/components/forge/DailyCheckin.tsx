import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  getDailyCheckin,
  saveDailyCheckin,
  getRoutineOverride,
  autoAdaptRoutineForPain,
  type DailyCheckin as DC,
  type RoutineOverride,
} from "@/lib/coach.functions";
import { useForge, todayISO } from "@/lib/forge-store";
import { ForgeButton } from "./ui/ForgeButton";

const BODY_PARTS = [
  "rodilla", "tobillo", "cadera", "lumbar", "cervical", "hombro", "codo", "muñeca",
  "pecho", "abdomen", "isquios", "cuádriceps", "gemelos", "pie",
];

export function DailyCheckinModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (msg?: string) => void;
}) {
  const save = useServerFn(saveDailyCheckin);
  const adapt = useServerFn(autoAdaptRoutineForPain);
  const fetchCur = useServerFn(getDailyCheckin);
  const qc = useQueryClient();
  const state = useForge();
  const date = todayISO();
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const todaysWorkout = useMemo(() => {
    const dow = new Date().getDay();
    const idx = (dow + 6) % 7;
    return state.routine[idx % Math.max(1, state.routine.length)] ?? null;
  }, [state.routine]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const cur = await fetchCur({ data: { date } });
      if (cur) {
        const map: Record<string, number> = {};
        for (const p of cur.pain_areas) map[p.body_part] = p.severity;
        setSelected(map);
        setNotes(cur.notes || "");
      } else {
        setSelected({});
        setNotes("");
      }
    })();
  }, [open, date, fetchCur]);

  if (!open) return null;

  function toggle(part: string) {
    setSelected((prev) => {
      const cur = prev[part];
      if (cur === undefined) return { ...prev, [part]: 2 };
      if (cur >= 5) {
        const { [part]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [part]: cur + 1 };
    });
  }

  async function submit() {
    setSaving(true);
    try {
      const pain_areas = Object.entries(selected).map(([body_part, severity]) => ({
        body_part,
        severity,
      }));
      await save({ data: { date, pain_areas, notes } });
      qc.invalidateQueries({ queryKey: ["daily-checkin", date] });

      let toastMsg = "Check-in guardado";
      if (todaysWorkout && state.answers) {
        const res = await adapt({
          data: {
            date,
            workout: todaysWorkout,
            pain_areas,
            profile: {
              level: state.answers.level,
              weight: state.answers.weight,
              equipment: state.answers.equipment,
            },
          },
        });
        if (res.adapted) {
          toastMsg = res.message ?? "Rutina adaptada según tus molestias";
          qc.invalidateQueries({
            queryKey: ["routine-override", date, todaysWorkout.id],
          });
        } else if (pain_areas.length === 0) {
          qc.invalidateQueries({
            queryKey: ["routine-override", date, todaysWorkout.id],
          });
        }
      }

      onSaved(toastMsg);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ci-overlay" role="dialog" aria-modal>
      <motion.div
        className="ci-modal"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="label-sm" style={{ color: "var(--acc)" }}>CHECK-IN DIARIO</div>
        <h3 style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>
          ¿Algún dolor o molestia hoy?
        </h3>
        <p className="label-sm" style={{ textTransform: "none", letterSpacing: 0, marginTop: 4 }}>
          Tocá una zona para marcar intensidad (1–5). Tocá de nuevo para subir, una vez más para quitar.
        </p>
        <div className="ci-grid">
          {BODY_PARTS.map((p) => {
            const sev = selected[p];
            return (
              <motion.button
                key={p}
                type="button"
                className={`ci-chip ${sev ? `sev-${sev}` : ""}`}
                onClick={() => toggle(p)}
                whileTap={{ scale: 0.96 }}
              >
                {p}{sev ? ` · ${sev}` : ""}
              </motion.button>
            );
          })}
        </div>
        <textarea
          placeholder="Notas (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ marginTop: 10 }}
        />
        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          <ForgeButton variant="outline" onClick={onClose} style={{ flex: 1 }} disabled={saving}>
            Cerrar
          </ForgeButton>
          <ForgeButton onClick={submit} style={{ flex: 2 }} disabled={saving}>
            {saving ? "Guardando…" : Object.keys(selected).length === 0 ? "Sin dolor hoy" : "Guardar"}
          </ForgeButton>
        </div>
      </motion.div>
    </div>
  );
}

export function useTodayCheckin() {
  const fetchCur = useServerFn(getDailyCheckin);
  return useQuery({
    queryKey: ["daily-checkin", todayISO()],
    queryFn: () => fetchCur({ data: { date: todayISO() } }),
  });
}

export function useTodayOverride(workoutId: string | null) {
  const fetchOv = useServerFn(getRoutineOverride);
  const date = todayISO();
  return useQuery({
    queryKey: ["routine-override", date, workoutId],
    queryFn: () =>
      workoutId ? fetchOv({ data: { date, workout_id: workoutId } }) : Promise.resolve(null),
    enabled: !!workoutId,
  });
}

export type { DC as DailyCheckinData, RoutineOverride };
