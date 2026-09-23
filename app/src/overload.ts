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
 * (peso en kg, reps si el ejercicio progresa por repeticiones, o el siguiente disco disponible
 * si progresa por "choice") según el RPE logueado.
 */
export function suggestNextLoad(
  logs: LogsState,
  exerciseName: string,
  todayISO: string,
  exerciseType: "principal" | "accesorio" = "accesorio",
  mode: "peso" | "reps" | "choice" = "peso",
  weightOptions?: number[]
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
    } else if (mode === "choice" && weightOptions && weightOptions.length > 0) {
      const sorted = [...weightOptions].sort((a, b) => a - b);
      // Si el último peso registrado no coincide con ninguna opción actual (ej. cambió el
      // equipo/implemento desde entonces), usa la opción más cercana como punto de partida
      // en vez de romperse — el mensaje sigue mostrando el peso real que se registró.
      let baseIdx = sorted.indexOf(value);
      if (baseIdx === -1) {
        baseIdx = sorted.reduce(
          (closest, opt, i) => (Math.abs(opt - value) < Math.abs(sorted[closest] - value) ? i : closest),
          0
        );
      }
      const base = sorted[baseIdx];

      if (rpe < 7) {
        const atMax = baseIdx >= sorted.length - 1;
        suggestedValue = atMax ? base : sorted[baseIdx + 1];
        message = atMax
          ? `Última vez ${value}kg @ RPE ${rpe} — se sintió fácil, pero ya es el disco más pesado que tienes.`
          : `Última vez ${value}kg @ RPE ${rpe} — se sintió fácil, se sugiere subir al disco de ${suggestedValue}kg.`;
      } else if (rpe <= 8.5) {
        suggestedValue = base;
        message = `Última vez ${value}kg @ RPE ${rpe} — buen nivel, mantén el disco de ${base}kg hoy.`;
      } else {
        const atMin = baseIdx <= 0;
        suggestedValue = atMin ? base : sorted[baseIdx - 1];
        message = atMin
          ? `Última vez ${value}kg @ RPE ${rpe} — estuvo al límite, ya es el disco más ligero.`
          : `Última vez ${value}kg @ RPE ${rpe} — estuvo al límite, se sugiere bajar al disco de ${suggestedValue}kg.`;
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
        : mode === "choice"
          ? "Sin historial todavía — elige un disco conservador y ajusta con el RPE."
          : "Sin historial todavía — usa un peso conservador y ajusta con el RPE.",
    suggestedValue: null,
  };
}
