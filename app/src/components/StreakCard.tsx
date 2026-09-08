import { useState } from "react";
import { computeStreak, computeProtectionStatus, getActivatableMiss, getCurrentWeekTraining } from "../trainingSchedule";
import { activateStreakProtection } from "../api";
import type { LogsState } from "../types";

const RING_SIZE = 132;
const STROKE = 10;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function StreakCard({ logs, onRefresh }: { logs: LogsState; onRefresh: () => void }) {
  const today = new Date();
  const streak = computeStreak(logs, today);
  const protection = computeProtectionStatus(logs, today);
  const activatable = getActivatableMiss(logs, today);
  const weekDays = getCurrentWeekTraining(logs, today);
  const completed = weekDays.filter((d) => d.status === "done").length;
  const total = weekDays.length;
  const pct = total > 0 ? completed / total : 0;
  const offset = CIRCUMFERENCE * (1 - pct);

  const [activating, setActivating] = useState(false);
  const [activateMsg, setActivateMsg] = useState<string | null>(null);

  async function handleActivate() {
    if (!activatable) return;
    setActivating(true);
    setActivateMsg(null);
    try {
      await activateStreakProtection(activatable.iso);
      onRefresh();
    } catch {
      setActivateMsg("Error activando la protección.");
    } finally {
      setActivating(false);
    }
  }

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
        {protection.available > 0
          ? `🧊 ${protection.available} protección${protection.available === 1 ? "" : "es"} de racha disponible${protection.available === 1 ? "" : "s"}`
          : `🧊 sin protecciones — ${protection.cleanStreak}/15 días limpios para ganar una`}
      </p>

      {activatable && (
        <div className="streak-activate-row">
          {protection.available > 0 ? (
            <button className="btn-outline streak-activate-btn" onClick={handleActivate} disabled={activating}>
              {activating ? "Activando..." : `Activar protección para el ${activatable.label}`}
            </button>
          ) : (
            <p className="muted small">
              Te faltó entrenar el {activatable.label} y no tienes protecciones disponibles.
            </p>
          )}
          {activateMsg && <p className="muted small">{activateMsg}</p>}
        </div>
      )}

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
