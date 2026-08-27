import { trainingPlan } from "./data/plans";
import { toISODate, weekdayKey, addDays, startOfWeekSunday, WEEKDAY_LABELS_ES } from "./dateUtils";
import type { TrainingBlock, TrainingDay, LogsState } from "./types";

export type ResolvedTraining =
  | { kind: "day"; block: TrainingBlock; day: TrainingDay }
  | { kind: "rest"; block: TrainingBlock }
  | { kind: "pending"; block: TrainingBlock }
  | { kind: "none" };

export function getBlockForDate(iso: string): TrainingBlock | null {
  return trainingPlan.blocks.find((b) => iso >= b.startDate && iso <= b.endDate) ?? null;
}

export function resolveTrainingForDate(date: Date): ResolvedTraining {
  const iso = toISODate(date);
  const wKey = weekdayKey(date);
  const block = getBlockForDate(iso);

  if (!block) return { kind: "none" };
  if (!block.days) return { kind: "pending", block };

  const day = block.days.find((d) => d.defaultWeekday === wKey);
  if (!day) return { kind: "rest", block };

  return { kind: "day", block, day };
}

export function nextTrainingCheckpoint(fromISO: string): { date: string; label: string } | null {
  const upcoming = trainingPlan.checkpoints
    .filter((c) => c.date >= fromISO)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  return upcoming[0] ?? null;
}

export function currentBlock(fromISO: string): TrainingBlock | null {
  return getBlockForDate(fromISO);
}

export type WeekDayStatus = {
  iso: string;
  label: string;
  day: TrainingDay;
  status: "done" | "missed" | "pending" | "future";
};

/**
 * Días con rutina programada (kind === "day") de la semana actual (domingo a
 * sábado), con su estado. Para el plan actual esto da los 5 días lunes-viernes,
 * pero se deriva del horario real en vez de asumirlo fijo.
 */
export function getCurrentWeekTraining(logs: LogsState, today: Date = new Date()): WeekDayStatus[] {
  const start = startOfWeekSunday(today);
  const todayISO = toISODate(today);
  const out: WeekDayStatus[] = [];

  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i);
    const resolved = resolveTrainingForDate(date);
    if (resolved.kind !== "day") continue;

    const iso = toISODate(date);
    const completed = !!logs.sessions[iso]?.completed;
    let status: WeekDayStatus["status"];
    if (iso > todayISO) status = "future";
    else if (completed) status = "done";
    else if (iso === todayISO) status = "pending";
    else status = "missed";

    out.push({ iso, label: WEEKDAY_LABELS_ES[weekdayKey(date)], day: resolved.day, status });
  }

  return out;
}

export type YearDot = { iso: string; status: "neutral" | "done" | "missed" | "rest" };

/**
 * Grilla año completo: 12 columnas (meses) x hasta 31 filas (día del mes), null
 * para fechas que no existen (ej. 30 de febrero). gris/neutral cubre tanto el
 * futuro como fechas sin bloque de entrenamiento asignado (antes de que
 * existiera el plan, o huecos entre bloques) — no hay suficiente info para
 * juzgarlas. Hoy se trata como neutral si aún no se completa (el día no ha
 * terminado), igual que en computeStreak.
 */
export function getYearGrid(logs: LogsState, year: number, today: Date = new Date()): (YearDot | null)[][] {
  const todayISO = toISODate(today);

  return Array.from({ length: 12 }, (_, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: 31 }, (_, i) => {
      const dayOfMonth = i + 1;
      if (dayOfMonth > daysInMonth) return null;

      const date = new Date(year, month, dayOfMonth);
      const iso = toISODate(date);
      let status: YearDot["status"] = "neutral";

      if (iso <= todayISO) {
        const resolved = resolveTrainingForDate(date);
        if (resolved.kind === "day") {
          const completed = !!logs.sessions[iso]?.completed;
          status = completed ? "done" : iso === todayISO ? "neutral" : "missed";
        } else if (resolved.kind === "rest") {
          status = "rest";
        }
      }

      return { iso, status };
    });
  });
}

const EARLIEST_BLOCK_DATE = trainingPlan.blocks.reduce(
  (min, b) => (b.startDate < min ? b.startDate : min),
  trainingPlan.blocks[0]?.startDate ?? "9999-12-31"
);

/**
 * Racha de sesiones consecutivas completadas, contando solo días con rutina
 * programada (kind === "day") — fines de semana y descanso no la rompen ni la
 * alargan. Si hoy toca entrenar pero todavía no se marca completa, no cuenta
 * (ni rompe) la racha: el día no ha terminado.
 */
export function computeStreak(logs: LogsState, today: Date = new Date()): number {
  let streak = 0;
  let cursor = new Date(today);

  const todayResolved = resolveTrainingForDate(cursor);
  if (todayResolved.kind === "day" && !logs.sessions[toISODate(cursor)]?.completed) {
    cursor = addDays(cursor, -1);
  }

  while (toISODate(cursor) >= EARLIEST_BLOCK_DATE) {
    const resolved = resolveTrainingForDate(cursor);
    if (resolved.kind !== "day") {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (logs.sessions[toISODate(cursor)]?.completed) {
      streak += 1;
      cursor = addDays(cursor, -1);
    } else {
      break;
    }
  }

  return streak;
}
