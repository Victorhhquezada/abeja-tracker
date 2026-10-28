import { ATHLETE_IDS, withAthlete, type AthleteId } from "./athletes";
import { addDays, toISODate } from "./dateUtils";
import { computeStreak, resolveTrainingForDate } from "./trainingSchedule";
import type { LogsState, Redemption } from "./types";

// Reglas de puntos (aprobadas):
//   sesión completada = 10 pts × multiplicador de racha (+10% por cada 5 días de racha, máx ×2)
//   semana completa (todos sus días de entrenamiento) = +25 pts
//   los dos entrenan el mismo día = +10 pts para cada uno
// Los puntos arrancan en cero para los dos en la misma fecha, y la racha que sube el multiplicador
// también se cuenta desde esa fecha, para que nadie arranque con ventaja por su historial.
export const POINTS_LAUNCH_DATE = "2026-10-27";
export const BASE_POINTS = 10;
export const WEEK_BONUS = 25;
export const CREW_BONUS = 10;
const MULTIPLIER_STEP = 0.1;
const MULTIPLIER_CAP = 2;
const STREAK_DAYS_PER_STEP = 5;

export function streakMultiplier(streak: number): number {
  return Math.min(MULTIPLIER_CAP, 1 + MULTIPLIER_STEP * Math.floor(streak / STREAK_DAYS_PER_STEP));
}

export type PointsSummary = {
  sessions: number;
  weekBonus: number;
  crewBonus: number;
  /** todo lo ganado, sin descontar canjes — con esto se ordena el ranking */
  earned: number;
  /** racha contada desde la fecha de lanzamiento (la que sube el multiplicador) */
  streak: number;
  multiplier: number;
  /** días de racha que faltan para el siguiente multiplicador, o null si ya está en el tope */
  daysToNextBoost: number | null;
  byDate: Record<string, number>;
};

function mondayOf(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const offset = date.getDay() === 0 ? -6 : 1 - date.getDay();
  return addDays(date, offset);
}

/** Fechas en que los dos atletas completaron su sesión. */
export function crewTrainingDays(a: LogsState, b: LogsState): Set<string> {
  const days = new Set<string>();
  for (const [date, s] of Object.entries(a.sessions)) {
    if (date >= POINTS_LAUNCH_DATE && s.completed && b.sessions[date]?.completed) days.add(date);
  }
  return days;
}

export function computePoints(
  athlete: AthleteId,
  logs: LogsState,
  crewDays: Set<string>,
  today: Date = new Date()
): PointsSummary {
  return withAthlete(athlete, () => {
    const todayISO = toISODate(today);
    let streak = 0;
    let sessions = 0;
    let crewBonus = 0;
    let weekBonus = 0;
    const byDate: Record<string, number> = {};
    const weeks = new Map<string, { scheduled: number; done: number; lastDate: string; allDone: boolean }>();

    for (
      let cursor = new Date(`${POINTS_LAUNCH_DATE}T00:00:00`);
      toISODate(cursor) <= todayISO;
      cursor = addDays(cursor, 1)
    ) {
      const iso = toISODate(cursor);
      if (resolveTrainingForDate(cursor).kind !== "day") continue;

      const monday = mondayOf(cursor);
      const weekKey = toISODate(monday);
      let week = weeks.get(weekKey);
      if (!week) {
        let scheduled = 0;
        for (let i = 0; i < 7; i++) if (resolveTrainingForDate(addDays(monday, i)).kind === "day") scheduled++;
        week = { scheduled, done: 0, lastDate: iso, allDone: true };
        weeks.set(weekKey, week);
      }
      week.lastDate = iso;

      if (logs.sessions[iso]?.completed) {
        streak += 1;
        week.done += 1;
        const points = Math.round(BASE_POINTS * streakMultiplier(streak));
        sessions += points;
        byDate[iso] = (byDate[iso] ?? 0) + points;
        if (crewDays.has(iso)) {
          crewBonus += CREW_BONUS;
          byDate[iso] += CREW_BONUS;
        }
      } else if (logs.streakProtections?.includes(iso)) {
        week.allDone = false; // la racha se salva pero la semana ya no es perfecta
      } else if (iso < todayISO) {
        streak = 0;
        week.allDone = false;
      } else {
        week.allDone = false; // hoy todavía no se registra
      }
    }

    // Solo semanas completas que arrancan en o después de la fecha de lanzamiento
    for (const [weekKey, week] of weeks) {
      if (weekKey >= POINTS_LAUNCH_DATE && week.allDone && week.done === week.scheduled && week.scheduled > 0) {
        weekBonus += WEEK_BONUS;
        byDate[week.lastDate] = (byDate[week.lastDate] ?? 0) + WEEK_BONUS;
      }
    }

    const multiplier = streakMultiplier(streak);
    return {
      sessions,
      weekBonus,
      crewBonus,
      earned: sessions + weekBonus + crewBonus,
      streak,
      multiplier,
      daysToNextBoost: multiplier >= MULTIPLIER_CAP ? null : STREAK_DAYS_PER_STEP - (streak % STREAK_DAYS_PER_STEP),
      byDate,
    };
  });
}

/** Puntos ganados en la semana actual (lunes a domingo). */
export function weekPoints(summary: PointsSummary, today: Date = new Date()): number {
  const monday = toISODate(mondayOf(today));
  const sunday = toISODate(addDays(mondayOf(today), 6));
  return Object.entries(summary.byDate).reduce((sum, [d, p]) => (d >= monday && d <= sunday ? sum + p : sum), 0);
}

/** Sesiones completadas / programadas en la semana actual. */
export function weekProgress(athlete: AthleteId, logs: LogsState, today: Date = new Date()): { done: number; scheduled: number } {
  return withAthlete(athlete, () => {
    const monday = mondayOf(today);
    let done = 0;
    let scheduled = 0;
    for (let i = 0; i < 7; i++) {
      const day = addDays(monday, i);
      if (resolveTrainingForDate(day).kind !== "day") continue;
      scheduled++;
      if (logs.sessions[toISODate(day)]?.completed) done++;
    }
    return { done, scheduled };
  });
}

export function athleteStreak(athlete: AthleteId, logs: LogsState, today: Date = new Date()): number {
  return withAthlete(athlete, () => computeStreak(logs, today));
}

export function spentPoints(athlete: AthleteId, redemptions: Redemption[]): number {
  return redemptions.reduce((sum, r) => sum + (r.split[athlete] ?? 0), 0);
}

/**
 * Cómo se paga un premio. Si no se combina, lo paga solo quien lo canjea. Si se combina (hot pot),
 * cada quien pone hasta la mitad y quien tenga de sobra cubre lo que le falte al otro.
 * Devuelve null si no alcanza.
 */
export function splitPayment(
  cost: number,
  pooled: boolean,
  me: AthleteId,
  balances: Record<AthleteId, number>
): Record<AthleteId, number> | null {
  const split = Object.fromEntries(ATHLETE_IDS.map((id) => [id, 0])) as Record<AthleteId, number>;
  if (!pooled) {
    if (balances[me] < cost) return null;
    split[me] = cost;
    return split;
  }
  let remaining = cost;
  const half = Math.ceil(cost / ATHLETE_IDS.length);
  for (const id of ATHLETE_IDS) {
    const pay = Math.min(balances[id], half, remaining);
    split[id] = pay;
    remaining -= pay;
  }
  for (const id of ATHLETE_IDS) {
    const extra = Math.min(balances[id] - split[id], remaining);
    split[id] += extra;
    remaining -= extra;
  }
  return remaining === 0 ? split : null;
}
