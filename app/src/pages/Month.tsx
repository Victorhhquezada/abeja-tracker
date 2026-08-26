import { useState } from "react";
import { trainingPlan } from "../data/plans";
import { monthMatrix, MONTH_LABELS_ES, toISODate } from "../dateUtils";
import { resolveTrainingForDate, currentBlock } from "../trainingSchedule";
import DayDetailModal from "../components/DayDetailModal";
import type { LogsState, SessionLog } from "../types";

// Un emoji por día en vez de repetir el texto completo del focus — la celda del
// calendario es muy chica para texto y se veía apretado/desbordado. Mapeado por id de
// día (no por texto) para que no se rompa si el focus se reescribe más adelante.
const DAY_EMOJI: Record<string, string> = {
  dia1: "🔄", // core rotacional / pierna unilateral
  dia2: "💪", // tracción y acarreo
  dia3: "🌀", // core rotacional variado
  dia4: "🛞", // potencia con llanta
  dia5: "🏋️", // día fuerte
};
const REST_EMOJI = "😴";
const PENDING_EMOJI = "⏳";

export default function Month({ logs }: { logs: LogsState }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const weeks = monthMatrix(year, month);
  const todayISO = toISODate(now);
  const block = currentBlock(todayISO);

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  return (
    <div className="page">
      <h1>Entrenamiento — {block?.label ?? "Sin bloque activo"}</h1>
      {block?.phase && <p className="muted">{block.phase}</p>}
      <p className="muted small">
        Fechas de chequeo (recálculo del plan): {trainingPlan.checkpoints.map((c) => c.date.slice(5)).join(" · ")}
      </p>

      <div className="month-nav">
        <button onClick={prevMonth}>‹</button>
        <strong>
          {MONTH_LABELS_ES[month]} {year}
        </strong>
        <button onClick={nextMonth}>›</button>
      </div>

      <div className="calendar">
        <div className="calendar-row calendar-header">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
            <div key={d} className="calendar-cell header">
              {d}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div className="calendar-row" key={wi}>
            {week.map((date, di) => {
              if (!date) return <div className="calendar-cell empty" key={di} />;
              const iso = toISODate(date);
              const resolved = resolveTrainingForDate(date);
              const session = logs.sessions[iso] as SessionLog | undefined;
              const isToday = iso === todayISO;

              let dayEmoji = "";
              let cellExtraClass = "";
              let ariaLabel = "";
              if (resolved.kind === "day") {
                dayEmoji = DAY_EMOJI[resolved.day.id] ?? "🏋️";
                ariaLabel = resolved.day.focus;
              } else if (resolved.kind === "rest") {
                dayEmoji = REST_EMOJI;
                ariaLabel = "Descanso";
              } else if (resolved.kind === "pending") {
                dayEmoji = PENDING_EMOJI;
                cellExtraClass = "pending";
                ariaLabel = "Pendiente";
              } else {
                cellExtraClass = "empty-plan";
                ariaLabel = "Sin bloque activo";
              }

              return (
                <button
                  className={`calendar-cell ${isToday ? "today" : ""} ${cellExtraClass}`.trim()}
                  key={di}
                  onClick={() => setSelected(iso)}
                  aria-label={`${date.getDate()} — ${ariaLabel}`}
                >
                  <div className="calendar-date">{date.getDate()}</div>
                  {dayEmoji && (
                    <div className="calendar-emoji" aria-hidden="true">
                      {dayEmoji}
                    </div>
                  )}
                  {session?.completed && <div className="calendar-progress">✓</div>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {selected && <DayDetailModal date={selected} logs={logs} onClose={() => setSelected(null)} />}
    </div>
  );
}
