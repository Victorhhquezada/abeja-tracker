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

const PROTECTION_EARN_THRESHOLD = 15; // 15 días de entrenamiento seguidos (lun-vie) = 3 semanas limpias

function isProtected(logs: LogsState, iso: string): boolean {
  return !!logs.streakProtections?.includes(iso);
}

/**
 * Racha de sesiones consecutivas completadas, contando solo días con rutina
 * programada (kind === "day") — fines de semana y descanso no la rompen ni la
 * alargan. Si hoy toca entrenar pero todavía no se marca completa, no cuenta
 * (ni rompe) la racha: el día no ha terminado. Un día protegido (ver
 * activateStreakProtection) tampoco la rompe, pero tampoco suma al número —
 * la protección "salta" el hueco, no lo convierte en un día entrenado.
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

    const iso = toISODate(cursor);
    if (logs.sessions[iso]?.completed) {
      streak += 1;
      cursor = addDays(cursor, -1);
      continue;
    }

    if (isProtected(logs, iso)) {
      cursor = addDays(cursor, -1);
      continue;
    }

    break;
  }

  return streak;
}

export type ProtectionStatus = { earned: number; used: number; available: number; cleanStreak: number };

/**
 * Simulación cronológica (hacia adelante, desde el inicio del bloque) de las
 * protecciones de racha ganadas y gastadas. Se gana 1 protección cada
 * PROTECTION_EARN_THRESHOLD días de entrenamiento consecutivos y "limpios"
 * (sin usar ninguna protección en el camino) — un día protegido cuenta como
 * corte de esa racha limpia, igual que un día realmente perdido, aunque el
 * número de racha mostrado (computeStreak) sí lo salte. Hoy no se evalúa
 * todavía (el día no ha terminado).
 */
export function computeProtectionStatus(logs: LogsState, today: Date = new Date()): ProtectionStatus {
  const todayISO = toISODate(today);
  let clean = 0;
  let earned = 0;
  let used = 0;

  for (let cursor = new Date(`${EARLIEST_BLOCK_DATE}T00:00:00`); toISODate(cursor) < todayISO; cursor = addDays(cursor, 1)) {
    const resolved = resolveTrainingForDate(cursor);
    if (resolved.kind !== "day") continue;

    const iso = toISODate(cursor);
    if (logs.sessions[iso]?.completed) {
      clean += 1;
      if (clean % PROTECTION_EARN_THRESHOLD === 0) earned += 1;
    } else if (isProtected(logs, iso)) {
      used += 1;
      clean = 0;
    } else {
      clean = 0;
    }
  }

  return { earned, used, available: Math.max(0, earned - used), cleanStreak: clean };
}

/**
 * El día de entrenamiento perdido más reciente (antes de hoy) que todavía no
 * se protege — el candidato a activar una protección, disponible a partir
 * del día siguiente al que se perdió. Si el día de entrenamiento más
 * reciente ya está completado o protegido, no hay nada que activar.
 */
export function getActivatableMiss(logs: LogsState, today: Date = new Date()): { iso: string; label: string } | null {
  let cursor = addDays(today, -1);

  while (toISODate(cursor) >= EARLIEST_BLOCK_DATE) {
    const resolved = resolveTrainingForDate(cursor);
    if (resolved.kind === "day") {
      const iso = toISODate(cursor);
      if (logs.sessions[iso]?.completed || isProtected(logs, iso)) return null;
      return { iso, label: WEEKDAY_LABELS_ES[weekdayKey(cursor)] };
    }
    cursor = addDays(cursor, -1);
  }

  return null;
}
