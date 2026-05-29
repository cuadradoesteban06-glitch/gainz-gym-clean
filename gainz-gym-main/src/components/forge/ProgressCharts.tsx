import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceDot,
} from "recharts";
import { getProgressLogs, type ExerciseLog } from "@/lib/coach.functions";

export default function ProgressCharts() {
  const fetchLogs = useServerFn(getProgressLogs);
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["exercise-logs"],
    queryFn: () => fetchLogs(),
  });

  const exercises = useMemo(() => {
    const map = new Map<string, { id: string; name: string; group: string }>();
    (logs as ExerciseLog[]).forEach((l) =>
      map.set(l.exercise_id, { id: l.exercise_id, name: l.exercise_name, group: l.muscle_group })
    );
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [logs]);

  const groups = useMemo(() => Array.from(new Set(exercises.map((e) => e.group))).sort(), [exercises]);

  const [group, setGroup] = useState<string>("all");
  const [exerciseId, setExerciseId] = useState<string>("");
  const [range, setRange] = useState<"30" | "90" | "365" | "all">("90");

  const filteredExercises = useMemo(
    () => (group === "all" ? exercises : exercises.filter((e) => e.group === group)),
    [exercises, group]
  );

  const selectedId = exerciseId || filteredExercises[0]?.id || "";

  const series = useMemo(() => {
    if (!selectedId) return [] as { date: string; weight: number; isPR: boolean }[];
    const cutoff = range === "all"
      ? null
      : new Date(Date.now() - Number(range) * 86400000).toISOString().slice(0, 10);
    // best set per date for selected exercise
    const byDate = new Map<string, { weight: number; isPR: boolean }>();
    for (const l of logs as ExerciseLog[]) {
      if (l.exercise_id !== selectedId) continue;
      if (cutoff && l.date < cutoff) continue;
      const w = Number(l.weight_kg ?? 0);
      const prev = byDate.get(l.date);
      if (!prev || w > prev.weight) byDate.set(l.date, { weight: w, isPR: !!l.is_pr || (prev?.isPR ?? false) });
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, weight: v.weight, isPR: v.isPR }));
  }, [logs, selectedId, range]);

  const prMax = useMemo(() => {
    if (series.length === 0) return null;
    let max = series[0];
    for (const p of series) if (p.weight > max.weight) max = p;
    return max;
  }, [series]);

  if (isLoading) return <div className="card"><div className="label-sm">Cargando progreso…</div></div>;

  if (exercises.length === 0) {
    return (
      <div className="card">
        <div className="label-sm">SIN DATOS</div>
        <p style={{ marginTop: 6, fontSize: 14, textTransform: "none", letterSpacing: 0 }}>
          Completá series con peso para ver tu progresión y récords personales.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="card">
        <div className="label-sm" style={{ marginBottom: 8 }}>FILTROS</div>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          <select value={group} onChange={(e) => { setGroup(e.target.value); setExerciseId(""); }} style={{ width: "auto", flex: 1, minWidth: 120 }}>
            <option value="all">Todos los grupos</option>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={selectedId} onChange={(e) => setExerciseId(e.target.value)} style={{ width: "auto", flex: 2, minWidth: 160 }}>
            {filteredExercises.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div className="row" style={{ gap: 6, marginTop: 8 }}>
          {(["30","90","365","all"] as const).map((r) => (
            <button key={r} className={`btnX ${range === r ? "" : ""}`} style={{ flex: 1, background: range === r ? "var(--acc-soft)" : "transparent", color: range === r ? "var(--acc)" : "var(--muted-c)", borderColor: range === r ? "var(--acc)" : "var(--border-c)" }} onClick={() => setRange(r)}>
              {r === "all" ? "Todo" : `${r}d`}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
          <div className="label-sm">PROGRESIÓN DE PESO</div>
          {prMax && <span className="tagG">PR {prMax.weight}kg</span>}
        </div>
        {series.length === 0 ? (
          <div className="label-sm" style={{ textTransform: "none", letterSpacing: 0 }}>Sin registros en este rango.</div>
        ) : (
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fill: "#888", fontSize: 11 }} />
                <YAxis tick={{ fill: "#888", fontSize: 11 }} unit="kg" />
                <Tooltip
                  contentStyle={{ background: "#1a1a1c", border: "1px solid #2a2a2e", borderRadius: 8, color: "#fff" }}
                  labelStyle={{ color: "#aaa" }}
                />
                <Line type="monotone" dataKey="weight" stroke="#39FF14" strokeWidth={2.5} dot={{ r: 3, fill: "#39FF14" }} activeDot={{ r: 6 }} animationDuration={600} />
                {prMax && (
                  <ReferenceDot x={prMax.date} y={prMax.weight} r={7} fill="#CFFF04" stroke="#000" strokeWidth={2} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}