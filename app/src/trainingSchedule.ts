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
 * Un punto por día del año (1 de enero a 31 de diciembre), en orden
 * cronológico plano. gris/neutral cubre tanto el futuro como fechas sin
 * bloque de entrenamiento asignado (antes de que existiera el plan, o huecos
 * entre bloques) — no hay suficiente info para juzgarlas. Hoy se trata como
 * neutral si aún no se completa (el día no ha terminado), igual que en
 * computeStreak.
 */
export function getYearDays(logs: LogsState, year: number, today: Date = new Date()): YearDot[] {
  const todayISO = toISODate(today);
  const end = new Date(year, 11, 31);
  const days: YearDot[] = [];

  for (let cursor = new Date(year, 0, 1); cursor <= end; cursor = addDays(cursor, 1)) {
    const iso = toISODate(cursor);
    let status: YearDot["status"] = "neutral";

    if (iso <= todayISO) {
      const resolved = resolveTrainingForDate(cursor);
      if (resolved.kind === "day") {
        const completed = !!logs.sessions[iso]?.completed;
        status = completed ? "done" : iso === todayISO ? "neutral" : "missed";
      } else if (resolved.kind === "rest") {
        status = "rest";
      }
    }

    days.push({ iso, status });
  }

  return days;
}

const EARLIEST_BLOCK_DATE = trainingPlan.blocks.reduce(
  (min, b) => (b.startDate < min ? b.startDate : min),
  trainingPlan.blocks[0]?.startDate ?? "9999-12-31"
);

const STREAK_FREEZES_PER_MONTH = 1;

/**
 * Camina hacia atrás desde `today` sobre los días con rutina programada,
 * contando la racha y aplicando la protección de racha: cada mes calendario
 * perdona hasta STREAK_FREEZES_PER_MONTH días sin completar — ese día no
 * suma a la racha, pero tampoco la corta. Se gasta empezando por el día
 * perdido más reciente; agotada la protección del mes, el siguiente día
 * perdido sí corta la racha.
 */
function walkStreak(logs: LogsState, today: Date): { streak: number; freezesUsedByMonth: Record<string, number> } {
  let streak = 0;
  let cursor = new Date(today);
  const freezesUsedByMonth: Record<string, number> = {};

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

    const iso = toISODate(cursor);
    if (logs.sessions[iso]?.completed) {
      streak += 1;
      cursor = addDays(cursor, -1);
      continue;
    }

    const monthKey = iso.slice(0, 7);
    const used = freezesUsedByMonth[monthKey] ?? 0;
    if (used < STREAK_FREEZES_PER_MONTH) {
      freezesUsedByMonth[monthKey] = used + 1;
      cursor = addDays(cursor, -1);
      continue;
    }

    break;
  }

  return { streak, freezesUsedByMonth };
}

/**
 * Racha de sesiones consecutivas completadas, contando solo días con rutina
 * programada (kind === "day") — fines de semana y descanso no la rompen ni la
 * alargan. Si hoy toca entrenar pero todavía no se marca completa, no cuenta
 * (ni rompe) la racha: el día no ha terminado. Incluye la protección de
 * racha (ver walkStreak).
 */
export function computeStreak(logs: LogsState, today: Date = new Date()): number {
  return walkStreak(logs, today).streak;
}

export type StreakFreezeStatus = { used: number; total: number; remaining: number };

/**
 * Cuántas protecciones de racha ya se gastaron y quedan en el mes de `today`.
 * Corre la misma caminata que computeStreak para que el conteo coincida
 * exactamente con lo que la racha mostrada ya aplicó.
 */
export function getStreakFreezeStatus(logs: LogsState, today: Date = new Date()): StreakFreezeStatus {
  const { freezesUsedByMonth } = walkStreak(logs, today);
  const monthKey = toISODate(today).slice(0, 7);
  const used = freezesUsedByMonth[monthKey] ?? 0;
  return { used, total: STREAK_FREEZES_PER_MONTH, remaining: Math.max(0, STREAK_FREEZES_PER_MONTH - used) };
}
