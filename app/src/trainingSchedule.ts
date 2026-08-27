import { trainingPlan } from "./data/plans";
import { toISODate, weekdayKey, addDays } from "./dateUtils";
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
