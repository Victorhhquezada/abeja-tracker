export type LiftingItem = {
  exercise: string;
  sets: number;
  targetReps: number | null;
  targetRpe: number | null;
  type: "principal" | "accesorio";
  note?: string;
  /** "reps" = progresa en repeticiones (ej. dominadas); por defecto progresa en peso (kg) */
  progressionMode?: "peso" | "reps";
};

export type TrainingDay = {
  id: string;
  order: number;
  label: string;
  defaultWeekday: string;
  focus: string;
  warmupMin: number;
  lifting: LiftingItem[];
};

export type TrainingCheckpoint = {
  date: string;
  label: string;
};

export type TrainingBlock = {
  id: string;
  label: string;
  phase?: string;
  startDate: string;
  endDate: string;
  days: TrainingDay[] | null;
  restDays?: string[];
  weeklyBoxingTally?: Record<string, unknown>;
  note?: string;
};

export type TrainingPlan = {
  version: number;
  updated: string;
  notes: string;
  progressiveOverload: Record<string, unknown>;
  checkpoints: TrainingCheckpoint[];
  blocks: TrainingBlock[];
};

export type SetLog = {
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
};

export type ExerciseLog = {
  sets: SetLog[];
};

export type SessionLog = {
  dayId: string;
  completed: boolean;
  exercises: Record<string, ExerciseLog>;
  notes?: string;
};

export type LogsState = {
  sessions: Record<string, SessionLog>;
};
