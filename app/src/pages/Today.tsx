import { useEffect, useState } from "react";
import { toISODate, weekdayKey, formatHuman, WEEKDAY_LABELS_ES } from "../dateUtils";
import { saveSession, saveWeight } from "../api";
import { suggestNextLoad } from "../overload";
import { resolveTrainingForDate, nextTrainingCheckpoint } from "../trainingSchedule";
import ExerciseCard from "../components/ExerciseCard";
import type { LogsState, SessionLog, SetLog } from "../types";

function emptySets(
  count: number,
  targetReps: number | null,
  targetRpe: number | null = null,
  repsMode: boolean = false,
  suggestedValue: number | null = null
): SetLog[] {
  if (repsMode) {
    return Array.from({ length: count }, () => ({ weightKg: null, reps: suggestedValue, rpe: targetRpe }));
  }
  return Array.from({ length: count }, () => ({ weightKg: suggestedValue, reps: targetReps, rpe: targetRpe }));
}

export default function Today({ logs, onRefresh }: { logs: LogsState; onRefresh: () => void }) {
  const today = new Date();
  const todayISO = toISODate(today);
  const wKey = weekdayKey(today);

  const resolvedTraining = resolveTrainingForDate(today);
  const trainingDay = resolvedTraining.kind === "day" ? resolvedTraining.day : null;
  const checkpoint = nextTrainingCheckpoint(todayISO);

  const existingSession = logs.sessions[todayISO] as SessionLog | undefined;

  const [exercises, setExercises] = useState<Record<string, { sets: SetLog[] }>>({});
  const [boxingCompleted, setBoxingCompleted] = useState(false);
  const [notes, setNotes] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const isLocked = !!existingSession?.completed && !editing;

  useEffect(() => {
    if (trainingDay) {
      const init: Record<string, { sets: SetLog[] }> = {};
      for (const item of trainingDay.lifting) {
        const existing = existingSession?.exercises?.[item.exercise];
        const repsMode = item.progressionMode === "reps";
        if (existing?.sets?.length) {
          init[item.exercise] = { sets: existing.sets };
        } else {
          const suggestion = suggestNextLoad(logs, item.exercise, todayISO, item.type, repsMode ? "reps" : "peso");
          init[item.exercise] = {
            sets: emptySets(item.sets, item.targetReps, item.targetRpe, repsMode, suggestion.suggestedValue),
          };
        }
      }
      setExercises(init);
      setBoxingCompleted(existingSession?.boxingCompleted ?? false);
      setNotes(existingSession?.notes ?? "");
    }
    setEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayISO]);

  function updateSet(exerciseName: string, setIndex: number, field: keyof SetLog, value: number | null) {
    setExercises((prev) => {
      const current = prev[exerciseName]?.sets ?? [];
      const nextSets = current.map((s, i) => (i === setIndex ? { ...s, [field]: value } : s));
      return { ...prev, [exerciseName]: { sets: nextSets } };
    });
  }

  async function handleCompleteSession() {
    if (!trainingDay) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const session: SessionLog = {
        dayId: trainingDay.id,
        completed: true,
        exercises,
        boxingCompleted,
        notes,
      };
      await saveSession(todayISO, session);
      setSaveMsg("Sesión guardada ✓");
      setEditing(false);
      onRefresh();
    } catch {
      setSaveMsg("Error guardando la sesión.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveWeight() {
    const val = Number(weightInput);
    if (!val || val <= 0) return;
    try {
      await saveWeight(todayISO, val);
      setWeightInput("");
      onRefresh();
    } catch {
      setSaveMsg("No se pudo guardar el peso.");
    }
  }

  return (
    <div className="page">
      <h1>{WEEKDAY_LABELS_ES[wKey]}</h1>
      <p className="muted">{formatHuman(today)}</p>

      {checkpoint && (
        <p className="muted small checkpoint-banner">
          Próxima fecha de chequeo/recálculo: {checkpoint.label} —{" "}
          {new Date(`${checkpoint.date}T00:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}
        </p>
      )}

      <section className="card">
        <h2>Peso de hoy</h2>
        {logs.weight[todayISO] != null && (
          <div className="metric-card">
            <span className="metric-value">{logs.weight[todayISO]}</span>
            <span className="metric-unit">kg hoy</span>
          </div>
        )}
        <div className="weight-row">
          <input
            type="number"
            inputMode="decimal"
            placeholder="kg"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
          />
          <button onClick={handleSaveWeight}>Guardar peso</button>
        </div>
      </section>

      {resolvedTraining.kind === "day" && trainingDay && (
        <section className="card">
          <h2>
            Rutina de hoy — {trainingDay.label}: {trainingDay.focus}
          </h2>
          <p className="muted">Calentamiento: {trainingDay.warmupMin} min</p>

          {trainingDay.lifting.map((item) => {
            const repsMode = item.progressionMode === "reps";
            return (
              <ExerciseCard
                key={item.exercise}
                item={item}
                sets={
                  exercises[item.exercise]?.sets ??
                  emptySets(item.sets, item.targetReps, item.targetRpe, repsMode)
                }
                suggestion={
                  suggestNextLoad(logs, item.exercise, todayISO, item.type, repsMode ? "reps" : "peso").message
                }
                onChange={(i, field, value) => updateSet(item.exercise, i, field, value)}
                locked={isLocked}
              />
            );
          })}

          <div className="boxing-block">
            <h3>
              Boxeo ({trainingDay.boxingRounds} rounds, ~{trainingDay.boxingMinutes} min)
            </h3>
            <ul>
              {trainingDay.boxing.map((b, i) => (
                <li key={i}>
                  {b.rounds} round{b.rounds > 1 ? "s" : ""} — {b.type}
                </li>
              ))}
            </ul>
            <label className="boxing-check">
              <input
                type="checkbox"
                checked={boxingCompleted}
                disabled={isLocked}
                onChange={(e) => setBoxingCompleted(e.target.checked)}
              />
              Boxeo completado
            </label>
          </div>

          <textarea
            className="notes"
            placeholder="Notas de la sesión (opcional)"
            value={notes}
            disabled={isLocked}
            onChange={(e) => setNotes(e.target.value)}
          />

          {isLocked ? (
            <div className="session-locked-row">
              <span className="status-badge-done">✓ Sesión completada</span>
              <button className="btn-outline" onClick={() => setEditing(true)}>
                Editar
              </button>
            </div>
          ) : (
            <button className="complete-btn" onClick={handleCompleteSession} disabled={saving}>
              {existingSession?.completed
                ? saving
                  ? "Guardando..."
                  : "Guardar cambios"
                : saving
                  ? "Guardando..."
                  : "Marcar sesión completa"}
            </button>
          )}
          {saveMsg && <p className="muted save-msg">{saveMsg}</p>}
        </section>
      )}

      {resolvedTraining.kind === "rest" && (
        <section className="card">
          <h2>Día de descanso</h2>
          <p className="muted">No hay rutina programada hoy. Movilidad ligera o caminata si tienes ganas.</p>
        </section>
      )}

      {resolvedTraining.kind === "pending" && (
        <section className="card">
          <h2>Rutina — {resolvedTraining.block.label}</h2>
          <p className="muted">{resolvedTraining.block.note ?? "Bloque pendiente de definir."}</p>
        </section>
      )}

      {resolvedTraining.kind === "none" && (
        <section className="card">
          <h2>Rutina</h2>
          <p className="muted">Todavía no hay un bloque de entrenamiento activo para esta fecha.</p>
        </section>
      )}
    </div>
  );
}
