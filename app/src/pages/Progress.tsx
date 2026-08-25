import { useMemo, useState } from "react";
import { trainingPlan } from "../data/plans";
import LineChart from "../components/LineChart";
import type { LogsState } from "../types";

// Solo interesa trackear progreso en los básicos: sentadilla, press de banca, peso muerto y press militar
// (y sus variantes técnicas, ej. "Paused SQ" o "RDL") — todo lo demás es accesorio y no se muestra aquí.
const MAIN_LIFT_PATTERN = /\b(SQ|BP|DL|RDL|OHP)\b/;

export default function Progress({ logs }: { logs: LogsState }) {
  const exerciseNames = useMemo(() => {
    const names = new Set<string>();
    trainingPlan.blocks.forEach((b) =>
      b.days?.forEach((d) =>
        d.lifting.forEach((l) => {
          if (MAIN_LIFT_PATTERN.test(l.exercise)) names.add(l.exercise);
        })
      )
    );
    return Array.from(names).sort();
  }, []);

  const [selected, setSelected] = useState(exerciseNames[0] ?? "");

  const rpePoints = useMemo(() => {
    if (!selected) return [];
    const points: { x: string; y: number }[] = [];
    Object.entries(logs.sessions)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .forEach(([date, session]: [string, any]) => {
        const ex = session?.exercises?.[selected];
        if (!ex?.sets?.length) return;
        const withRpe = ex.sets.filter((s: any) => s.weightKg != null);
        if (withRpe.length === 0) return;
        const top = withRpe.reduce((a: any, b: any) => (b.weightKg > a.weightKg ? b : a));
        points.push({ x: date.slice(5), y: top.weightKg });
      });
    return points;
  }, [logs.sessions, selected]);

  return (
    <div className="page">
      <h1>Progreso</h1>

      <section className="card">
        <h2>Carga por ejercicio (para progresión)</h2>
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {exerciseNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <LineChart points={rpePoints} color="#4a90d9" unit=" kg" />
      </section>
    </div>
  );
}
