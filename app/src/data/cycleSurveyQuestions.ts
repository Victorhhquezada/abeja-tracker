import type { SurveyFeeling } from "../types";

// Cómo se siente el atleta físicamente al cerrar el bloque. Son las cualidades que el programa
// apunta a mejorar; preguntar exactamente estas cierra el círculo entre lo que se diseñó y lo que
// el atleta realmente siente.
export const CAPABILITY_QUESTIONS: { key: string; label: string }[] = [
  { key: "fuerza_general", label: "¿Te sientes más fuerte?" },
  { key: "explosividad", label: "¿Te sientes más explosivo?" },
  { key: "velocidad", label: "¿Te sientes más rápido?" },
  { key: "musculacion", label: "¿Notas más músculo (más musculación)?" },
  { key: "agilidad", label: "¿Te sientes más ágil?" },
];

export const FEELING_OPTIONS: { value: SurveyFeeling; label: string }[] = [
  { value: "much_more", label: "Mucho más" },
  { value: "a_bit_more", label: "Un poco más" },
  { value: "same", label: "Igual" },
  { value: "a_bit_less", label: "Un poco menos" },
  { value: "less", label: "Menos" },
];
