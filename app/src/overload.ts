import type { LogsState } from "./types";

const BAR_KG = 20;
const BAR_STEP = 2.5;
const LANDMINE_STEP = 1.25;
// 2 discos de 1.25 + 2 de 2.5 + 2 de 5 en un solo extremo
const LANDMINE_MAX = 17.5;

/** Redondea al peso de barra real más cercano: 20 (barra sola) + múltiplos de 2.5 (par de discos). */
function snapToBar(kg: number): number {
  return Math.max(BAR_KG, BAR_KG + Math.round((kg - BAR_KG) / BAR_STEP) * BAR_STEP);
}

function snapToLandmine(kg: number): number {
  return Math.min(LANDMINE_MAX, Math.max(0, Math.round(kg / LANDMINE_STEP) * LANDMINE_STEP));
}

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
  weightOptions?: number[],
  loadModel?: "barbell" | "landmine"
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
    } else if (loadModel === "landmine") {
      const base = snapToLandmine(value);
      if (rpe <= 8.5) {
        suggestedValue = Math.min(LANDMINE_MAX, base + LANDMINE_STEP);
        message =
          suggestedValue === base
            ? `Última vez ${value} kg de discos @ RPE ${rpe} — ya es el máximo de discos que tienes en la landmine (${LANDMINE_MAX} kg), mantén ese peso.`
            : `Última vez ${value} kg de discos @ RPE ${rpe} — ${rpe < 7 ? "se sintió fácil" : "buen nivel"}, se sugiere subir a ${suggestedValue} kg de discos (+${LANDMINE_STEP} kg).`;
      } else {
        suggestedValue = Math.max(0, base - LANDMINE_STEP);
        message =
          suggestedValue === base
            ? `Última vez ${value} kg de discos @ RPE ${rpe} — estuvo al límite, ya es la barra sola: mantén ese peso.`
            : `Última vez ${value} kg de discos @ RPE ${rpe} — estuvo al límite, se sugiere bajar a ${suggestedValue} kg de discos.`;
      }
    } else if (loadModel === "barbell") {
      if (value < BAR_KG) {
        suggestedValue = BAR_KG;
        message = `Última vez ${value} kg @ RPE ${rpe} — la barra sola pesa ${BAR_KG} kg, ese es el mínimo: empieza con la barra vacía (${BAR_KG} kg).`;
      } else {
        const base = snapToBar(value);
        if (rpe <= 8.5) {
          suggestedValue = base + BAR_STEP;
          message = `Última vez ${value} kg @ RPE ${rpe} — ${rpe < 7 ? "se sintió fácil" : "buen nivel"}, se sugiere subir a ${suggestedValue} kg (+${BAR_STEP} kg: un disco de 1.25 por lado).`;
        } else if (base <= BAR_KG) {
          suggestedValue = BAR_KG;
          message = `Última vez ${value} kg @ RPE ${rpe} — estuvo al límite, ya es la barra sola (${BAR_KG} kg): mantén ese peso.`;
        } else {
          suggestedValue = base - BAR_STEP;
          message = `Última vez ${value} kg @ RPE ${rpe} — estuvo al límite, se sugiere bajar a ${suggestedValue} kg.`;
        }
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
          : loadModel === "landmine"
            ? "Sin historial todavía — empieza con la barra sola o un disco de 1.25 en la punta (el peso es solo el de los discos) y sube de 1.25 en 1.25 kg según el RPE."
            : loadModel === "barbell"
            ? `Sin historial todavía — empieza con la barra vacía (${BAR_KG} kg) y sube de 2.5 en 2.5 kg según el RPE.`
            : "Sin historial todavía — usa un peso conservador y ajusta con el RPE.",
    suggestedValue: null,
  };
}
