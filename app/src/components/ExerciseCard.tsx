import type { LiftingItem, SetLog } from "../types";

export default function ExerciseCard({
  item,
  sets,
  suggestion,
  onChange,
  locked = false,
}: {
  item: LiftingItem;
  sets: SetLog[];
  suggestion: string;
  onChange: (setIndex: number, field: keyof SetLog, value: number | boolean | null) => void;
  locked?: boolean;
}) {
  const mode = item.progressionMode ?? "peso";
  const repsMode = mode === "reps";
  const checkMode = mode === "check";

  return (
    <div className="exercise-card">
      <div className="exercise-header">
        <strong>{item.exercise}</strong>
        <span className={`tag ${item.type}`}>{item.type}</span>
      </div>
      <div className="exercise-target">
        {checkMode ? `Objetivo: ${item.sets} rondas` : `Objetivo: ${item.sets} × ${item.targetReps ?? "-"} reps`}
        {!checkMode && item.targetRpe ? ` @ RPE ${item.targetRpe}` : ""}
        {item.note ? ` · ${item.note}` : ""}
      </div>
      {!locked && !checkMode && <div className="exercise-suggestion">{suggestion}</div>}
      <div className={`sets-grid ${checkMode ? "check-mode" : ""}`.trim()}>
        <div className="sets-grid-header">
          <span>Set</span>
          <span>{checkMode ? "Hecho" : repsMode ? "reps" : "kg"}</span>
          {!checkMode && <span>RPE</span>}
        </div>
        {sets.map((s, i) => (
          <div className="sets-grid-row" key={i}>
            {repsMode ? (
              <span className="set-num">
                <span>{i + 1}</span>
              </span>
            ) : (
              <span className="set-num">
                <span>{i + 1}</span>
                {!checkMode && <span className="muted">{item.targetReps ?? "-"} reps</span>}
              </span>
            )}
            {checkMode ? (
              <input
                type="checkbox"
                className="set-check"
                checked={!!s.done}
                disabled={locked}
                onChange={(e) => onChange(i, "done", e.target.checked)}
              />
            ) : repsMode ? (
              <input
                type="number"
                inputMode="numeric"
                value={s.reps ?? ""}
                disabled={locked}
                onChange={(e) => onChange(i, "reps", e.target.value === "" ? null : Number(e.target.value))}
              />
            ) : (
              <input
                type="number"
                inputMode="decimal"
                value={s.weightKg ?? ""}
                disabled={locked}
                onChange={(e) => onChange(i, "weightKg", e.target.value === "" ? null : Number(e.target.value))}
              />
            )}
            {!checkMode && (
              <input
                type="number"
                inputMode="decimal"
                min={1}
                max={10}
                step={0.5}
                value={s.rpe ?? ""}
                disabled={locked}
                onChange={(e) => onChange(i, "rpe", e.target.value === "" ? null : Number(e.target.value))}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
