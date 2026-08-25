import { useState } from "react";
import { startOfWeekSunday, addDays, toISODate, weekdayKey, WEEKDAY_LABELS_ES } from "../dateUtils";
import { resolveTrainingForDate } from "../trainingSchedule";
import DayDetailModal from "../components/DayDetailModal";
import type { LogsState, SessionLog } from "../types";

export default function Week({ logs }: { logs: LogsState }) {
  const sunday = startOfWeekSunday(new Date());
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="page">
      <h1>Rutina de la semana</h1>
      <p className="muted">
        Semana del {sunday.toLocaleDateString("es-MX", { day: "numeric", month: "long" })} · toca un día para
        ver el detalle
      </p>

      <div className="week-grid">
        {Array.from({ length: 7 }, (_, idx) => {
          const date = addDays(sunday, idx);
          const iso = toISODate(date);
          const wKey = weekdayKey(date);
          const session = logs.sessions[iso] as SessionLog | undefined;
          const done = session?.completed;
          const resolved = resolveTrainingForDate(date);

          return (
            <button
              className={done ? "week-day-card done" : "week-day-card"}
              key={iso}
              onClick={() => setSelected(iso)}
            >
              <div className="week-day-header">
                <strong>{WEEKDAY_LABELS_ES[wKey]}</strong>
                {done && <span className="check">✓</span>}
              </div>

              {resolved.kind === "day" && (
                <>
                  <div className="muted">{resolved.day.focus}</div>
                  <ul className="week-exercise-list">
                    {resolved.day.lifting.map((l) => (
                      <li key={l.exercise}>
                        {l.exercise} — {l.sets}×{l.targetReps ?? "-"}
                        {l.targetRpe ? ` @${l.targetRpe}` : ""}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {resolved.kind === "rest" && <div className="muted">Descanso</div>}
              {resolved.kind === "pending" && <div className="muted">Pendiente — {resolved.block.label}</div>}
              {resolved.kind === "none" && <div className="muted">Sin bloque activo</div>}
            </button>
          );
        })}
      </div>

      {selected && <DayDetailModal date={selected} logs={logs} onClose={() => setSelected(null)} />}
    </div>
  );
}
