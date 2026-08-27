import { getYearDays } from "../trainingSchedule";
import type { LogsState } from "../types";

const LEGEND: { status: "done" | "missed" | "rest" | "neutral"; label: string }[] = [
  { status: "done", label: "Completado" },
  { status: "missed", label: "No entrenó" },
  { status: "rest", label: "Descanso" },
  { status: "neutral", label: "Sin datos" },
];

export default function YearActivityGraph({ logs }: { logs: LogsState }) {
  const year = new Date().getFullYear();
  const days = getYearDays(logs, year);

  const totals = { done: 0, missed: 0, rest: 0 };
  for (const d of days) {
    if (d.status === "done") totals.done++;
    else if (d.status === "missed") totals.missed++;
    else if (d.status === "rest") totals.rest++;
  }

  return (
    <section className="card year-graph-card">
      <h2>{year}</h2>
      <p className="muted small">Así se ven tus sesiones acumuladas en el año.</p>

      <div className="year-dots">
        {days.map((d) => (
          <div key={d.iso} className={`year-dot year-dot-${d.status}`} title={d.iso} />
        ))}
      </div>

      <div className="year-legend">
        {LEGEND.map((item) => (
          <div className="year-legend-item" key={item.status}>
            <span className={`year-legend-swatch year-dot-${item.status}`} />
            {item.label}
            {item.status !== "neutral" && <span className="muted"> · {totals[item.status]}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
