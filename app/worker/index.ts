// Single Worker entry point (this project is a Worker-with-assets deployment, not Cloudflare
// Pages — the Pages Functions file-based routing convention under app/functions/ doesn't apply
// here, so all three API routes are handled directly in one fetch handler, falling back to
// env.ASSETS for everything else (the built SPA).

import { signToken, verifyToken } from "./_auth";

interface Env {
  ASSETS: Fetcher;
  LOGS: KVNamespace;
  /** contraseña de ABEJA (se llama así desde antes de que hubiera más atletas) */
  APP_PASSWORD: string;
  APP_PASSWORD_OSCAR?: string;
  APP_TOKEN_SECRET: string;
}

const ATHLETE_IDS = ["abeja", "oscar"] as const;
type AthleteId = (typeof ATHLETE_IDS)[number];

function isAthleteId(value: unknown): value is AthleteId {
  return typeof value === "string" && (ATHLETE_IDS as readonly string[]).includes(value);
}

function athletePassword(env: Env, id: AthleteId): string | undefined {
  return id === "abeja" ? env.APP_PASSWORD : env.APP_PASSWORD_OSCAR;
}

/** Los datos de cada atleta viven en su propia llave. ABEJA empezó en la llave "logs", así que
 *  se lee de ahí hasta que su primer guardado la migre a "logs:abeja" (la vieja queda de respaldo). */
function logsKey(id: AthleteId): string {
  return `logs:${id}`;
}

async function readLogs(env: Env, id: AthleteId): Promise<LogsData | null> {
  const own = await env.LOGS.get<LogsData>(logsKey(id), "json");
  if (own) return own;
  return id === "abeja" ? env.LOGS.get<LogsData>("logs", "json") : null;
}

type LogsData = {
  sessions: Record<string, unknown>;
  streakProtections?: string[];
  cycleSurveys?: Record<string, unknown>;
};

const EMPTY: LogsData = { sessions: {} };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

async function handleAuth(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let body: { password?: string; athlete?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body inválido" }, 400);
  }

  // Un cliente viejo todavía en caché no manda atleta: siempre fue ABEJA.
  const athlete = body.athlete ?? "abeja";
  if (!isAthleteId(athlete)) return json({ error: "Atleta desconocido" }, 400);

  const expected = athletePassword(env, athlete);
  if (!expected) return json({ error: "La contraseña de este atleta no está configurada en el servidor" }, 500);
  if (body.password !== expected) {
    return json({ error: "Contraseña incorrecta" }, 401);
  }

  const token = await signToken(env.APP_TOKEN_SECRET || "dev-secret-change-me", athlete);
  return json({ token, athlete });
}

async function handleState(request: Request, env: Env): Promise<Response> {
  const athlete = await verifyToken(request, env.APP_TOKEN_SECRET || "dev-secret-change-me");
  if (!isAthleteId(athlete)) return new Response("Unauthorized", { status: 401 });
  const data = await readLogs(env, athlete);
  return json(data || EMPTY);
}

async function handleSave(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const athlete = await verifyToken(request, env.APP_TOKEN_SECRET || "dev-secret-change-me");
  if (!isAthleteId(athlete)) return new Response("Unauthorized", { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response("Body inválido", { status: 400 });
  }

  const { kind, date } = body;
  if (!kind) return new Response("Falta kind", { status: 400 });

  const data = (await readLogs(env, athlete)) || { sessions: { ...EMPTY.sessions } };

  if (kind === "session") {
    if (!date) return new Response("Falta date", { status: 400 });
    data.sessions[date] = body.session;
  } else if (kind === "protection") {
    if (!date) return new Response("Falta date", { status: 400 });
    const set = new Set(data.streakProtections ?? []);
    set.add(date);
    data.streakProtections = [...set].sort();
  } else if (kind === "survey") {
    const { blockId, response } = body;
    if (!blockId || !response) return new Response("Falta blockId o response", { status: 400 });
    data.cycleSurveys = data.cycleSurveys ?? {};
    data.cycleSurveys[blockId] = response;
  } else {
    return new Response("kind desconocido", { status: 400 });
  }

  await env.LOGS.put(logsKey(athlete), JSON.stringify(data));
  return json({ ok: true, data });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/auth") return handleAuth(request, env);
    if (url.pathname === "/api/state") return handleState(request, env);
    if (url.pathname === "/api/save") return handleSave(request, env);

    return env.ASSETS.fetch(request);
  },
};
