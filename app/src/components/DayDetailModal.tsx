import { useRef, useState } from "react";
import { weekdayKey, WEEKDAY_LABELS_ES } from "../dateUtils";
import { resolveTrainingForDate } from "../trainingSchedule";
import type { LogsState, SessionLog } from "../types";

function parseISO(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

const DISMISS_DISTANCE = 120; // px
const DISMISS_VELOCITY = 0.6; // px/ms

type DragState = { startY: number; startTime: number };

export default function DayDetailModal({
  date,
  logs,
  onClose,
}: {
  date: string;
  logs: LogsState;
  onClose: () => void;
}) {
  const d = parseISO(date);
  const wKey = weekdayKey(d);
  const resolvedTraining = resolveTrainingForDate(d);
  const trainingDay = resolvedTraining.kind === "day" ? resolvedTraining.day : null;

  const session = logs.sessions[date] as SessionLog | undefined;

  const humanDate = d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [dismissing, setDismissing] = useState(false);

  function reducedMotion() {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function handleHandlePointerDown(e: React.PointerEvent) {
    if (reducedMotion()) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startTime: performance.now() };
    const panel = panelRef.current;
    if (panel) {
      panel.style.transition = "none";
      panel.style.willChange = "transform";
    }
  }

  function handleHandlePointerMove(e: React.PointerEvent) {
    const state = dragRef.current;
    const panel = panelRef.current;
    if (!state || !panel) return;
    const deltaY = e.clientY - state.startY;
    // 1:1 tracking downward; soft rubber-band resistance if dragged upward
    const applied = deltaY > 0 ? deltaY : deltaY * 0.25;
    panel.style.transform = `translateY(${applied}px)`;
  }

  function handleHandlePointerUp(e: React.PointerEvent) {
    const state = dragRef.current;
    const panel = panelRef.current;
    if (!state || !panel) return;
    const deltaY = e.clientY - state.startY;
    const elapsed = Math.max(performance.now() - state.startTime, 1);
    const velocity = deltaY / elapsed;
    dragRef.current = null;
    panel.style.willChange = "";
    panel.style.transition = "transform 220ms var(--ease-standard)";

    if (deltaY > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) {
      panel.style.transform = "translateY(100%)";
      setDismissing(true);
      window.setTimeout(onClose, 200);
    } else {
      panel.style.transform = "translateY(0)";
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={panelRef}
        className={dismissing ? "modal-panel dismissing" : "modal-panel"}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="modal-drag-handle"
          onPointerDown={handleHandlePointerDown}
          onPointerMove={handleHandlePointerMove}
          onPointerUp={handleHandlePointerUp}
          onPointerCancel={handleHandlePointerUp}
          aria-hidden="true"
        />
        <div className="modal-header">
          <div>
            <h2>{WEEKDAY_LABELS_ES[wKey]}</h2>
            <p className="muted">{humanDate}</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {trainingDay ? (
          <section className="modal-section">
            <h3>
              Rutina — {trainingDay.label}: {trainingDay.focus}
              {session?.completed && <span className="check"> ✓ completada</span>}
            </h3>
            <ul className="modal-exercise-list">
              {trainingDay.lifting.map((item) => {
                const repsMode = item.progressionMode === "reps";
                const loggedSets = session?.exercises?.[item.exercise]?.sets;
                const hasLog = loggedSets?.some((s) => (repsMode ? s.reps != null : s.weightKg != null));
                return (
                  <li key={item.exercise}>
                    <div>
                      <strong>{item.exercise}</strong>{" "}
                      <span className="muted small">
                        objetivo {item.sets}×{item.targetReps ?? "-"}
                        {item.targetRpe ? ` @RPE ${item.targetRpe}` : ""}
                      </span>
                    </div>
                    {hasLog ? (
                      <div className="modal-set-log">
                        {loggedSets
                          ?.filter((s) => (repsMode ? s.reps != null : s.weightKg != null))
                          .map((s, i) => (
                            <span key={i} className="set-chip">
                              {repsMode ? `${s.reps} reps` : `${s.weightKg}kg×${s.reps ?? "-"}`}
                              {s.rpe ? ` @${s.rpe}` : ""}
                            </span>
                          ))}
                      </div>
                    ) : (
                      <div className="muted small">Sin registro</div>
                    )}
                  </li>
                );
              })}
            </ul>
            {session?.notes && (
              <div className="modal-notes">
                <span className="muted small">Notas:</span> {session.notes}
              </div>
            )}
          </section>
        ) : (
          <section className="modal-section">
            {resolvedTraining.kind === "rest" && (
              <>
                <h3>Día de descanso</h3>
                <p className="muted">No hay rutina programada.</p>
              </>
            )}
            {resolvedTraining.kind === "pending" && (
              <>
                <h3>Rutina — {resolvedTraining.block.label}</h3>
                <p className="muted">{resolvedTraining.block.note ?? "Bloque pendiente de definir."}</p>
              </>
            )}
            {resolvedTraining.kind === "none" && (
              <>
                <h3>Rutina</h3>
                <p className="muted">Todavía no hay un bloque de entrenamiento activo para esta fecha.</p>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
