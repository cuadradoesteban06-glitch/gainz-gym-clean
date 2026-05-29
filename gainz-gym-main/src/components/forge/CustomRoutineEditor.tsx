import { useMemo, useState } from "react";
import {
  setState,
  type CustomExercise,
  type CustomRoutine,
} from "@/lib/forge-store";

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function emptyExercise(): CustomExercise {
  return { id: uid(), name: "", sets: 3, reps: "10", weight: "", rest: 60 };
}

function fromExisting(r: CustomRoutine): CustomRoutine {
  return JSON.parse(JSON.stringify(r));
}

function makeDraft(): CustomRoutine {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name: "",
    days: 3,
    notes: "",
    exercises: [emptyExercise()],
    createdAt: now,
    updatedAt: now,
  };
}

const REST_OPTIONS = [30, 45, 60, 90, 120, 150];

export function CustomRoutineEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial?: CustomRoutine;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [draft, setDraft] = useState<CustomRoutine>(() =>
    initial ? fromExisting(initial) : makeDraft()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editingExId, setEditingExId] = useState<string | null>(
    initial ? null : draft.exercises[0]?.id ?? null
  );

  const isEdit = !!initial;

  function patch(p: Partial<CustomRoutine>) {
    setDraft((d) => ({ ...d, ...p }));
  }
  function patchEx(id: string, p: Partial<CustomExercise>) {
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((e) => (e.id === id ? { ...e, ...p } : e)),
    }));
  }
  function addEx() {
    const ex = emptyExercise();
    setDraft((d) => ({ ...d, exercises: [...d.exercises, ex] }));
    setEditingExId(ex.id);
  }
  function removeEx(id: string) {
    if (!confirm("¿Eliminar este ejercicio?")) return;
    setDraft((d) => ({ ...d, exercises: d.exercises.filter((e) => e.id !== id) }));
  }
  function moveEx(id: string, dir: -1 | 1) {
    setDraft((d) => {
      const i = d.exercises.findIndex((e) => e.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.exercises.length) return d;
      const arr = [...d.exercises];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...d, exercises: arr };
    });
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!draft.name.trim()) errs.name = "Poné un nombre a tu rutina";
    if (!draft.days || draft.days < 1) errs.days = "Cantidad de días inválida";
    if (draft.exercises.length === 0) errs.exercises = "Agregá al menos un ejercicio";
    draft.exercises.forEach((ex, i) => {
      if (!ex.name.trim()) errs[`ex_${ex.id}`] = `Ejercicio #${i + 1}: falta el nombre`;
      if (!ex.sets || ex.sets < 1) errs[`ex_${ex.id}`] = `Ejercicio #${i + 1}: series inválidas`;
      if (!ex.reps.trim()) errs[`ex_${ex.id}`] = `Ejercicio #${i + 1}: reps inválidas`;
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function save() {
    if (!validate()) return;
    const now = new Date().toISOString();
    const toSave: CustomRoutine = {
      ...draft,
      name: draft.name.trim(),
      notes: draft.notes.trim(),
      exercises: draft.exercises.map((e) => ({
        ...e,
        name: e.name.trim(),
        weight: e.weight.trim(),
      })),
      updatedAt: now,
      createdAt: isEdit ? draft.createdAt : now,
    };
    setState((s) => {
      const exists = s.customRoutines.some((r) => r.id === toSave.id);
      return {
        ...s,
        customRoutines: exists
          ? s.customRoutines.map((r) => (r.id === toSave.id ? toSave : r))
          : [toSave, ...s.customRoutines],
      };
    });
    onSaved(isEdit ? "Rutina actualizada ✓" : "Rutina creada ✓");
  }

  const errList = useMemo(() => Object.values(errors), [errors]);

  return (
    <>
      <header className="hdr">
        <button className="btnX" onClick={onClose}>← Volver</button>
        <span className="mono" style={{ fontSize: 12, color: "var(--muted-c)", letterSpacing: 2 }}>
          {isEdit ? "EDITAR RUTINA" : "NUEVA RUTINA"}
        </span>
      </header>

      <main className="body">
        <div className="cardA">
          <div className="label-sm">DETALLES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
            <div>
              <label className="label-sm">Nombre de la rutina</label>
              <input
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="Ej: Push Pull Legs"
                maxLength={60}
                style={{ marginTop: 4 }}
              />
            </div>
            <div>
              <label className="label-sm">Días por semana</label>
              <div className="g2" style={{ marginTop: 6, gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    className={`opt-btn ${draft.days === n ? "sel" : ""}`}
                    style={{ padding: "10px 0", textAlign: "center", fontWeight: 800 }}
                    onClick={() => patch({ days: n })}
                    type="button"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label-sm">Notas (opcional)</label>
              <textarea
                value={draft.notes}
                onChange={(e) => patch({ notes: e.target.value })}
                placeholder="Notas, objetivos, recordatorios..."
                rows={3}
                style={{ marginTop: 4 }}
              />
            </div>
          </div>
        </div>

        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="h-section" style={{ margin: 0 }}>
            EJERCICIOS · {draft.exercises.length}
          </div>
          <button className="btnO" onClick={addEx} style={{ padding: "8px 14px", fontSize: 13 }}>
            + Agregar
          </button>
        </div>

        {draft.exercises.length === 0 && (
          <div className="card">
            <p className="label-sm">Aún no agregaste ejercicios. Tocá “+ Agregar”.</p>
          </div>
        )}

        {draft.exercises.map((ex, i) => {
          const open = editingExId === ex.id;
          return (
            <div key={ex.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <button
                onClick={() => setEditingExId(open ? null : ex.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: 14, background: "transparent", border: 0, color: "var(--txt)",
                  textAlign: "left", cursor: "pointer",
                }}
              >
                <div className="cre-num">{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, textTransform: "uppercase" }}>
                    {ex.name || "Sin nombre"}
                  </div>
                  <div className="label-sm mono" style={{ marginTop: 3 }}>
                    {ex.sets}×{ex.reps || "—"}
                    {ex.weight ? ` · ${ex.weight}` : ""} · {ex.rest}s desc
                  </div>
                </div>
                <span style={{ fontSize: 20, opacity: 0.7 }}>{open ? "▾" : "▸"}</span>
              </button>

              {open && (
                <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label className="label-sm">Nombre</label>
                    <input
                      value={ex.name}
                      onChange={(e) => patchEx(ex.id, { name: e.target.value })}
                      placeholder="Ej: Press banca"
                      maxLength={60}
                      style={{ marginTop: 4 }}
                    />
                  </div>
                  <div className="g2">
                    <div>
                      <label className="label-sm">Series</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={20}
                        value={ex.sets}
                        onChange={(e) =>
                          patchEx(ex.id, { sets: Math.max(1, Number(e.target.value) || 1) })
                        }
                        style={{ marginTop: 4 }}
                      />
                    </div>
                    <div>
                      <label className="label-sm">Reps</label>
                      <input
                        value={ex.reps}
                        onChange={(e) => patchEx(ex.id, { reps: e.target.value })}
                        placeholder="10 o 8-12"
                        style={{ marginTop: 4 }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label-sm">Peso</label>
                    <input
                      value={ex.weight}
                      onChange={(e) => patchEx(ex.id, { weight: e.target.value })}
                      placeholder="Ej: 20kg, PC, hasta el fallo"
                      maxLength={40}
                      style={{ marginTop: 4 }}
                    />
                  </div>
                  <div>
                    <label className="label-sm">Descanso entre series</label>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 6,
                        marginTop: 6,
                      }}
                    >
                      {REST_OPTIONS.map((r) => (
                        <button
                          key={r}
                          className={`opt-btn ${ex.rest === r ? "sel" : ""}`}
                          style={{ padding: "10px 0", textAlign: "center", fontWeight: 700, fontSize: 13 }}
                          onClick={() => patchEx(ex.id, { rest: r })}
                          type="button"
                        >
                          {r}s
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="row" style={{ gap: 8, marginTop: 4 }}>
                    <button
                      className="btnO"
                      style={{ flex: 1, padding: "10px 0", fontSize: 13 }}
                      onClick={() => moveEx(ex.id, -1)}
                      disabled={i === 0}
                      type="button"
                    >
                      ↑ Subir
                    </button>
                    <button
                      className="btnO"
                      style={{ flex: 1, padding: "10px 0", fontSize: 13 }}
                      onClick={() => moveEx(ex.id, 1)}
                      disabled={i === draft.exercises.length - 1}
                      type="button"
                    >
                      ↓ Bajar
                    </button>
                    <button
                      className="btnX"
                      style={{ flex: 1, padding: "10px 0", fontSize: 13 }}
                      onClick={() => removeEx(ex.id)}
                      type="button"
                    >
                      🗑 Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <button className="btnO" onClick={addEx} type="button">
          + Agregar ejercicio
        </button>

        {errList.length > 0 && (
          <div className="card" style={{ borderColor: "#FF6B6B" }}>
            <div className="label-sm" style={{ color: "#FF6B6B" }}>REVISÁ:</div>
            <ul style={{ margin: "6px 0 0 18px", color: "#FF9B9B", fontSize: 13 }}>
              {errList.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        <div className="bottom-bar">
          <button className="btnG" onClick={save} type="button">
            ✓ {isEdit ? "Guardar cambios" : "Guardar rutina"}
          </button>
        </div>
      </main>
    </>
  );
}

/* ---------- Vista de una rutina personalizada (solo lectura) ---------- */
export function CustomRoutineView({
  routine,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  routine: CustomRoutine;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  return (
    <>
      <header className="hdr">
        <button className="btnX" onClick={onClose}>← Volver</button>
        <span className="mono" style={{ fontSize: 12, color: "var(--muted-c)", letterSpacing: 2 }}>
          MI RUTINA
        </span>
      </header>
      <main className="body">
        <div className="cardA">
          <span className="tag">{routine.days} días</span>
          <h2 style={{ fontSize: 24, fontWeight: 900, marginTop: 8 }}>{routine.name}</h2>
          {routine.notes && (
            <p className="label-sm" style={{ marginTop: 6, textTransform: "none", letterSpacing: 0.3 }}>
              {routine.notes}
            </p>
          )}
          <div className="row mono label-sm" style={{ marginTop: 10, gap: 14 }}>
            <span>{routine.exercises.length} ejercicios</span>
            <span>· creada {routine.createdAt.slice(0, 10)}</span>
          </div>
        </div>

        {routine.exercises.map((ex, i) => (
          <div key={ex.id} className="card">
            <div className="row" style={{ gap: 10, alignItems: "center" }}>
              <div className="cre-num">{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, textTransform: "uppercase" }}>
                  {ex.name}
                </div>
                <div className="label-sm mono" style={{ marginTop: 4 }}>
                  {ex.sets}×{ex.reps}
                  {ex.weight ? ` · ${ex.weight}` : ""} · {ex.rest}s desc
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="g2">
          <button className="btnO" onClick={onEdit}>✎ Editar</button>
          <button className="btnO" onClick={onDuplicate}>⧉ Duplicar</button>
        </div>
        <button className="btnX" onClick={onDelete}>🗑 Eliminar rutina</button>
      </main>
    </>
  );
}