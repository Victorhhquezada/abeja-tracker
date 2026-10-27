import abejaPlanJson from "./data/abeja/training-plan.json";
import oscarPlanJson from "./data/oscar/training-plan.json";
import { ABEJA_MEMES } from "./data/abeja/memes";
import { OSCAR_MEMES } from "./data/oscar/memes";
import type { TrainingPlan } from "./types";

export type AthleteId = "abeja" | "oscar";

export type AthleteConfig = {
  id: AthleteId;
  name: string;
  plan: TrainingPlan;
  memes: string[];
  /** logo de abeja + tipografía de marca en el login — solo para ABEJA */
  beeBrand: boolean;
};

export const ATHLETES: Record<AthleteId, AthleteConfig> = {
  abeja: {
    id: "abeja",
    name: "ABEJA",
    plan: abejaPlanJson as unknown as TrainingPlan,
    memes: ABEJA_MEMES,
    beeBrand: true,
  },
  oscar: {
    id: "oscar",
    name: "OSCAR",
    plan: oscarPlanJson as unknown as TrainingPlan,
    memes: OSCAR_MEMES,
    beeBrand: false,
  },
};

export const ATHLETE_IDS = Object.keys(ATHLETES) as AthleteId[];

const ATHLETE_KEY = "ht_athlete";

export function isAthleteId(value: unknown): value is AthleteId {
  return typeof value === "string" && value in ATHLETES;
}

/** Último atleta que inició sesión en este dispositivo. Las sesiones anteriores a la existencia de
 *  varios atletas no guardaban uno, y todas eran de ABEJA. */
export function storedAthleteId(): AthleteId {
  try {
    const v = localStorage.getItem(ATHLETE_KEY);
    if (isAthleteId(v)) return v;
  } catch {
    /* localStorage no disponible */
  }
  return "abeja";
}

let active: AthleteId = storedAthleteId();

export function setActiveAthlete(id: AthleteId) {
  active = id;
  try {
    localStorage.setItem(ATHLETE_KEY, id);
  } catch {
    /* localStorage no disponible */
  }
  document.title = ATHLETES[id].name;
}

export function getActiveAthlete(): AthleteConfig {
  return ATHLETES[active];
}

export function getTrainingPlan(): TrainingPlan {
  return ATHLETES[active].plan;
}
