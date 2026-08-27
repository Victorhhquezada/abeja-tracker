import { computeStreak, getCurrentWeekTraining, getStreakFreezeStatus } from "../trainingSchedule";
import type { LogsState } from "../types";

const RING_SIZE = 132;
const STROKE = 10;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function StreakCard({ logs }: { logs: LogsState }) {
  const today = new Date();
  const streak = computeStreak(logs, today);
  const freeze = getStreakFreezeStatus(logs, today);
  const weekDays = getCurrentWeekTraining(logs, today);
  const completed = weekDays.filter((d) => d.status === "done").length;
  const total = weekDays.length;
  const pct = total > 0 ? completed / total : 0;
  const offset = CIRCUMFERENCE * (1 - pct);

  return (
    <section className="card streak-card">
      <div className="streak-ring-wrap">
        <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
          <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS} stroke="var(--track)" strokeWidth={STROKE} fill="none" />
          {pct > 0 && (
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke="var(--accent)"
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          )}
        </svg>
        <div className="streak-ring-center">
          <span aria-hidden="true">🔥</span>
          <span className="streak-ring-number">{streak}</span>
        </div>
      </div>
      <p className="muted small streak-caption">
        {streak === 1 ? "1 día seguido" : `${streak} días seguidos`}
      </p>
      <p className="muted small streak-freeze-status">
        {freeze.remaining > 0
          ? "🧊 1 protección de racha disponible este mes"
          : "🧊 protección de racha usada este mes"}
      </p>

      <div className="week-dots" role="list" aria-label="Rutina de esta semana">
        {weekDays.map((d) => (
          <div
            key={d.iso}
            role="listitem"
            className={`week-dot week-dot-${d.status}`}
            aria-label={`${d.label}: ${
              d.status === "done"
                ? "completado"
                : d.status === "missed"
                  ? "no completado"
                  : d.status === "pending"
                    ? "pendiente hoy"
                    : "todavía no llega"
            }`}
          >
            {d.label[0]}
          </div>
        ))}
      </div>
    </section>
  );
}
