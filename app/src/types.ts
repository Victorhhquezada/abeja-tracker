export type LiftingItem = {
  exercise: string;
  sets: number;
  targetReps: number | null;
  targetRpe: number | null;
  type: "principal" | "accesorio";
  note?: string;
  /** "reps" = progresa en repeticiones (ej. dominadas o implementos de peso fijo como sandbag);
   *  "check" = sin peso ni reps, solo marca si se hizo (ej. planchas);
   *  "choice" = elige entre un set fijo de pesos (ej. discos de 10/15/20kg) en vez de teclear un número — ver weightOptions;
   *  por defecto progresa en peso (kg) libre */
  progressionMode?: "peso" | "reps" | "check" | "choice";
  /** solo para progressionMode "choice" — los pesos exactos disponibles, en kg */
  weightOptions?: number[];
  /** cómo se carga el peso real, para que las sugerencias solo propongan cargas posibles:
   *  "barbell" = barra olímpica: 20 kg la barra sola + discos en pares → 20, 22.5, 25, 27.5, 30... (saltos de 2.5, mínimo 20);
   *  "landmine" = barra en landmine con discos en un solo extremo (máx. 2 de 1.25, 2 de 2.5 y 2 de 5) → el peso registrado
   *  es solo el de los discos: 0, 1.25, 2.5, 3.75... hasta 17.5 (saltos de 1.25) */
  loadModel?: "barbell" | "landmine";
  /** links a videos de referencia (técnica) — se muestran como CTAs discretos en la tarjeta */
  videos?: { label: string; url: string }[];
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
  /** fechas ISO (días entre semana normalmente de entrenamiento) que se tratan como
   *  descanso — festivos, viajes, etc. No cuentan como perdidos ni rompen la racha. */
  holidays?: string[];
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
  /** solo para progressionMode "check" — hecho / no hecho, sin peso ni reps */
  done?: boolean | null;
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

export type SurveyFeeling = "much_more" | "a_bit_more" | "same" | "a_bit_less" | "less";

export type CycleSurveyResponse = {
  blockId: string;
  submittedAt: string;
  exerciseRatings: Record<string, number>;
  favorites: string[];
  leastFavorites: string[];
  feelings: Record<string, SurveyFeeling>;
  comments?: string;
};

export type LogsState = {
  sessions: Record<string, SessionLog>;
  /** fechas ISO de días de entrenamiento perdidos que se cubrieron con una protección de racha */
  streakProtections?: string[];
  /** encuestas de fin de ciclo ya respondidas, por id de bloque */
  cycleSurveys?: Record<string, CycleSurveyResponse>;
};
