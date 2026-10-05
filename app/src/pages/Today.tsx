import { useEffect, useState } from "react";
import { toISODate, weekdayKey, formatHuman, WEEKDAY_LABELS_ES } from "../dateUtils";
import { saveSession, saveSparring } from "../api";
import { suggestNextLoad } from "../overload";
import { resolveTrainingForDate, nextTrainingCheckpoint, getPendingCycleSurvey, lightenForSparring } from "../trainingSchedule";
import ExerciseCard from "../components/ExerciseCard";
import StreakCard from "../components/StreakCard";
import YearActivityGraph from "../components/YearActivityGraph";
import MemeModal from "../components/MemeModal";
import SurveyPendingBanner from "../components/SurveyPendingBanner";
import CycleSurveyModal from "../components/CycleSurveyModal";
import SparringPrompt from "../components/SparringPrompt";
import { MEMES } from "../data/memes";
import type { LogsState, SessionLog, SetLog } from "../types";

function randomMeme(): string | null {
  if (MEMES.length === 0) return null;
  return MEMES[Math.floor(Math.random() * MEMES.length)];
}

function emptySets(
  count: number,
  targetReps: number | null,
  targetRpe: number | null = null,
  mode: "peso" | "reps" | "check" | "choice" = "peso",
  suggestedValue: number | null = null
): SetLog[] {
  if (mode === "check") {
    return Array.from({ length: count }, () => ({ weightKg: null, reps: null, rpe: null, done: false }));
  }
  if (mode === "reps") {
    return Array.from({ length: count }, () => ({ weightKg: null, reps: suggestedValue, rpe: targetRpe }));
  }
  return Array.from({ length: count }, () => ({ weightKg: suggestedValue, reps: targetReps, rpe: targetRpe }));
}

export default function Today({ logs, onRefresh }: { logs: LogsState; onRefresh: () => void }) {
  const today = new Date();
  const todayISO = toISODate(today);
  const wKey = weekdayKey(today);

  const resolvedTraining = resolveTrainingForDate(today);
  const baseTrainingDay = resolvedTraining.kind === "day" ? resolvedTraining.day : null;
  const trainingOverride = resolvedTraining.kind === "day" ? resolvedTraining.override : undefined;

  const existingSession = logs.sessions[todayISO] as SessionLog | undefined;
  const [localSparred, setLocalSparred] = useState<boolean | undefined>(undefined);
  const [sparringSaving, setSparringSaving] = useState(false);
  const sparred: boolean | undefined = localSparred ?? logs.sparring?.[todayISO] ?? existingSession?.sparred;

  // Con sparring: rutina aligera y sin subir peso, salvo en semanas de pelea donde ya hay un taper propio
  const taper = trainingOverride
    ? { progression: trainingOverride.progression, loadPct: trainingOverride.loadPct }
    : sparred
      ? ({ progression: "hold" } as const)
      : undefined;
  const trainingDay = baseTrainingDay && sparred ? lightenForSparring(baseTrainingDay) : baseTrainingDay;
  // El día ya completado se muestra tal como se guardó, sin volver a preguntar
  const needsSparringAnswer = sparred === undefined && !existingSession?.completed;
  const checkpoint = nextTrainingCheckpoint(todayISO);
  const pendingSurveyBlock = getPendingCycleSurvey(logs, today);

  const [exercises, setExercises] = useState<Record<string, { sets: SetLog[] }>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [memeToShow, setMemeToShow] = useState<string | null>(null);
  const [surveyOpen, setSurveyOpen] = useState(false);

  const isLocked = !!existingSession?.completed && !editing;

  useEffect(() => {
    if (trainingDay) {
      const init: Record<string, { sets: SetLog[] }> = {};
      for (const item of trainingDay.lifting) {
        const existing = existingSession?.exercises?.[item.exercise];
        const mode = item.progressionMode ?? "peso";
        if (existing?.sets?.length) {
          init[item.exercise] = { sets: existing.sets };
        } else if (mode === "check") {
          init[item.exercise] = { sets: emptySets(item.sets, item.targetReps, item.targetRpe, mode) };
        } else {
          const suggestion = suggestNextLoad(logs, item.exercise, todayISO, item.type, mode, item.weightOptions, item.loadModel, taper);
          init[item.exercise] = {
            sets: emptySets(item.sets, item.targetReps, item.targetRpe, mode, suggestion.suggestedValue),
          };
        }
      }
      setExercises(init);
      setNotes(existingSession?.notes ?? "");
    }
    setEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayISO, sparred]);

  function updateSet(exerciseName: string, setIndex: number, field: keyof SetLog, value: number | boolean | null) {
    setExercises((prev) => {
      const current = prev[exerciseName]?.sets ?? [];
      const nextSets = current.map((s, i) => (i === setIndex ? { ...s, [field]: value } : s));
      return { ...prev, [exerciseName]: { sets: nextSets } };
    });
  }

  async function answerSparring(answer: boolean) {
    setLocalSparred(answer);
    setSparringSaving(true);
    try {
      await saveSparring(todayISO, answer);
      onRefresh();
    } catch {
      setSaveMsg("No se pudo guardar la respuesta de sparring, se volverá a preguntar.");
    } finally {
      setSparringSaving(false);
    }
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
        notes,
        sparred: sparred === true ? true : undefined,
      };
      await saveSession(todayISO, session);
      setSaveMsg("Sesión guardada ✓");
      setEditing(false);
      setMemeToShow(randomMeme());
      onRefresh();
    } catch {
      setSaveMsg("Error guardando la sesión.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      {pendingSurveyBlock && (
        <SurveyPendingBanner block={pendingSurveyBlock} today={today} onOpen={() => setSurveyOpen(true)} />
      )}

      <h1>{WEEKDAY_LABELS_ES[wKey]}</h1>
      <p className="muted">{formatHuman(today)}</p>

      <StreakCard logs={logs} onRefresh={onRefresh} />

      {checkpoint && (
        <p className="muted small checkpoint-banner">
          Próxima fecha de chequeo/recálculo: {checkpoint.label} —{" "}
          {new Date(`${checkpoint.date}T00:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}
        </p>
      )}

      {resolvedTraining.kind === "day" && trainingDay && needsSparringAnswer && (
        <SparringPrompt saving={sparringSaving} onAnswer={answerSparring} />
      )}

      {resolvedTraining.kind === "day" && trainingDay && !needsSparringAnswer && (
        <section className="card">
          {sparred !== undefined && (
            <div className="sparring-badge-row">
              <span className="muted small">{sparred ? "🥊 Con sparring hoy · versión ligera" : "Sin sparring · rutina completa"}</span>
              {!isLocked && (
                <button type="button" className="sparring-link" disabled={sparringSaving} onClick={() => answerSparring(!sparred)}>
                  Cambiar
                </button>
              )}
            </div>
          )}
          <h2>
            Rutina de hoy — {trainingDay.label}: {trainingDay.focus}
          </h2>
          <p className="muted">Calentamiento: {trainingDay.warmupMin} min</p>

          {trainingDay.lifting.map((item) => {
            const mode = item.progressionMode ?? "peso";
            return (
              <ExerciseCard
                key={item.exercise}
                item={item}
                sets={exercises[item.exercise]?.sets ?? emptySets(item.sets, item.targetReps, item.targetRpe, mode)}
                suggestion={
                  mode === "check"
                    ? ""
                    : suggestNextLoad(logs, item.exercise, todayISO, item.type, mode, item.weightOptions, item.loadModel, taper).message
                }
                onChange={(i, field, value) => updateSet(item.exercise, i, field, value)}
                locked={isLocked}
              />
            );
          })}

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

      {resolvedTraining.kind === "rest" &&
        (sparred === undefined ? (
          <SparringPrompt compact saving={sparringSaving} onAnswer={answerSparring} />
        ) : (
          <p className="muted small">{sparred ? "🥊 Sparring registrado hoy" : "Sin sparring hoy"}</p>
        ))}

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

      <YearActivityGraph logs={logs} />

      {memeToShow && <MemeModal src={memeToShow} onClose={() => setMemeToShow(null)} />}

      {surveyOpen && pendingSurveyBlock && (
        <CycleSurveyModal
          block={pendingSurveyBlock}
          onClose={() => setSurveyOpen(false)}
          onSubmitted={() => {
            setSurveyOpen(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
