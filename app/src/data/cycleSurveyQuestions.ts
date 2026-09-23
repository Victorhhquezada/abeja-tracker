import type { SurveyFeeling } from "../types";

// Capacidades físicas que el programa apunta a mejorar (ver justificación de cada
// ejercicio en training-plan.json) — preguntar sobre exactamente estas cierra el
// círculo entre lo que se diseñó y lo que el atleta realmente siente.
export const CAPABILITY_QUESTIONS: { key: string; label: string }[] = [
  { key: "fuerza_general", label: "¿Te sientes más fuerte en general?" },
  { key: "explosividad", label: "¿Te sientes más explosivo/potente al golpear?" },
  { key: "velocidad", label: "¿Te sientes más rápido (salida del golpe, movimiento en general)?" },
  { key: "rotacion_tronco", label: "¿Sientes más fuerza al girar el torso (los ganchos)?" },
  { key: "cuello", label: "¿Sientes el cuello más fuerte / mejor control de la cabeza al recibir golpes?" },
  { key: "agarre", label: "¿Sientes más fuerza de agarre?" },
  { key: "resistencia", label: "¿Sientes más resistencia/aguante (te cansas menos)?" },
  { key: "durabilidad", label: "¿Sientes menos molestias o te sientes más resistente a golpes/lesiones?" },
];

export const FEELING_OPTIONS: { value: SurveyFeeling; label: string }[] = [
  { value: "much_more", label: "Mucho más" },
  { value: "a_bit_more", label: "Un poco más" },
  { value: "same", label: "Igual" },
  { value: "a_bit_less", label: "Un poco menos" },
  { value: "less", label: "Menos" },
];

export const RATING_OPTIONS = [1, 2, 3, 4, 5];
