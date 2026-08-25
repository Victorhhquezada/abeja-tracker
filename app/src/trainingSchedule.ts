import { trainingPlan } from "./data/plans";
import { toISODate, weekdayKey } from "./dateUtils";
import type { TrainingBlock, TrainingDay } from "./types";

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
