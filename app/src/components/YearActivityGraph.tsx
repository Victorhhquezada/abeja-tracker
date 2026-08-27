import { Fragment } from "react";
import { getYearGrid } from "../trainingSchedule";
import type { LogsState } from "../types";

const MONTH_INITIALS_ES = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

const LEGEND: { status: "done" | "missed" | "rest" | "neutral"; label: string }[] = [
  { status: "done", label: "Completado" },
  { status: "missed", label: "No entrenó" },
  { status: "rest", label: "Descanso" },
  { status: "neutral", label: "Sin datos" },
];

export default function YearActivityGraph({ logs }: { logs: LogsState }) {
  const year = new Date().getFullYear();
  const grid = getYearGrid(logs, year);

  const totals = { done: 0, missed: 0, rest: 0 };
  for (const column of grid) {
    for (const cell of column) {
      if (cell?.status === "done") totals.done++;
      else if (cell?.status === "missed") totals.missed++;
      else if (cell?.status === "rest") totals.rest++;
    }
  }

  return (
    <section className="card year-graph-card">
      <h2>{year}</h2>
      <p className="muted small">Así se ven tus sesiones acumuladas en el año.</p>

      <div className="year-graph">
        <div className="year-graph-corner" />
        {MONTH_INITIALS_ES.map((m, i) => (
          <div key={i} className="year-graph-month-label">
            {m}
          </div>
        ))}
        {Array.from({ length: 31 }, (_, dayIdx) => (
          <Fragment key={dayIdx}>
            <div className="year-graph-day-label">{dayIdx + 1}</div>
            {grid.map((column, monthIdx) => {
              const cell = column[dayIdx];
              return cell ? (
                <div
                  key={monthIdx}
                  className={`year-dot year-dot-${cell.status}`}
                  title={cell.iso}
                />
              ) : (
                <div key={monthIdx} className="year-dot year-dot-empty" />
              );
            })}
          </Fragment>
        ))}
      </div>

      <div className="year-legend">
        {LEGEND.map((item) => (
          <div className="year-legend-item" key={item.status}>
            <span className={`year-legend-swatch year-dot-${item.status}`} />
            {item.label}
            {item.status !== "neutral" && (
              <span className="muted"> · {totals[item.status]}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
