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
  /** wordmark (PNG con transparencia) que se muestra en el login, teñido con el color de acento */
  logo: string | null;
  /** color de la barra del navegador / de estado en el celular */
  themeColor: string;
};

export const ATHLETES: Record<AthleteId, AthleteConfig> = {
  abeja: {
    id: "abeja",
    name: "ABEJA",
    plan: abejaPlanJson as unknown as TrainingPlan,
    memes: ABEJA_MEMES,
    beeBrand: true,
    logo: null,
    themeColor: "#000f08",
  },
  oscar: {
    id: "oscar",
    name: "OSCAR",
    plan: oscarPlanJson as unknown as TrainingPlan,
    memes: OSCAR_MEMES,
    beeBrand: false,
    logo: "/oscar-wordmark.png",
    themeColor: "#0b0a0a",
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

const ORIGINAL_THEME_COLORS = new Map<Element, string>();

/** Los colores de cada atleta viven en index.css bajo :root[data-athlete="..."]. Esto activa el
 *  que corresponde y alinea el color de la barra del navegador. También sirve para previsualizar
 *  el tema en el login antes de entrar. */
export function applyTheme(id: AthleteId) {
  document.documentElement.dataset.athlete = id;
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    if (!ORIGINAL_THEME_COLORS.has(meta)) ORIGINAL_THEME_COLORS.set(meta, meta.getAttribute("content") ?? "");
    meta.setAttribute("content", id === "abeja" ? ORIGINAL_THEME_COLORS.get(meta)! : ATHLETES[id].themeColor);
  });
}

applyTheme(active);

export function setActiveAthlete(id: AthleteId) {
  active = id;
  applyTheme(id);
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
