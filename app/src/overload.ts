import type { LogsState } from "./types";

export type Suggestion = {
  lastValue: number | null;
  lastRpe: number | null;
  lastDate: string | null;
  message: string;
  suggestedValue: number | null;
};

/**
 * Busca el registro más reciente de un ejercicio (por fecha) y sugiere el siguiente valor
 * (peso en kg, o reps si el ejercicio progresa por repeticiones) según el RPE logueado.
 */
export function suggestNextLoad(
  logs: LogsState,
  exerciseName: string,
  todayISO: string,
  exerciseType: "principal" | "accesorio" = "accesorio",
  mode: "peso" | "reps" = "peso"
): Suggestion {
  const dates = Object.keys(logs.sessions)
    .filter((d) => d < todayISO)
    .sort()
    .reverse();

  const step = exerciseType === "principal" ? 2.5 : 1.25;
  const valueKey = mode === "reps" ? "reps" : "weightKg";

  for (const date of dates) {
    const session = logs.sessions[date] as any;
    const ex = session?.exercises?.[exerciseName];
    if (!ex || !Array.isArray(ex.sets) || ex.sets.length === 0) continue;

    const withValues = ex.sets.filter((s: any) => s[valueKey] != null && s.rpe != null);
    if (withValues.length === 0) continue;

    const topSet = withValues.reduce((a: any, b: any) => (b[valueKey] > a[valueKey] ? b : a));
    const rpe = topSet.rpe as number;
    const value = topSet[valueKey] as number;

    let message: string;
    let suggestedValue: number;

    if (mode === "reps") {
      if (rpe < 7) {
        suggestedValue = value + 1;
        message = `Última vez ${value} reps @ RPE ${rpe} — se sintió fácil, se sugiere subir a ${suggestedValue} reps.`;
      } else if (rpe <= 8.5) {
        suggestedValue = value;
        message = `Última vez ${value} reps @ RPE ${rpe} — buen nivel, mantén ${value} reps hoy.`;
      } else {
        suggestedValue = Math.max(0, value - 1);
        message = `Última vez ${value} reps @ RPE ${rpe} — estuvo al límite, se sugiere bajar a ${suggestedValue} reps.`;
      }
    } else {
      if (rpe < 7) {
        suggestedValue = value + step;
        message = `Última vez ${value} kg @ RPE ${rpe} — se sintió fácil, se sugiere subir a ${suggestedValue} kg.`;
      } else if (rpe <= 8.5) {
        suggestedValue = value + step;
        message = `Última vez ${value} kg @ RPE ${rpe} — buen nivel, se sugiere subir a ${suggestedValue} kg.`;
      } else {
        suggestedValue = value - step;
        message = `Última vez ${value} kg @ RPE ${rpe} — estuvo al límite, se sugiere bajar a ${suggestedValue} kg.`;
      }
    }

    return { lastValue: value, lastRpe: rpe, lastDate: date, message, suggestedValue };
  }

  return {
    lastValue: null,
    lastRpe: null,
    lastDate: null,
    message:
      mode === "reps"
        ? "Sin historial todavía — haz las repeticiones que puedas hoy y ajusta con el RPE."
        : "Sin historial todavía — usa un peso conservador y ajusta con el RPE.",
    suggestedValue: null,
  };
}
