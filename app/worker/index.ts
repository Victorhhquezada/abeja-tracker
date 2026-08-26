// Single Worker entry point (this project is a Worker-with-assets deployment, not Cloudflare
// Pages — the Pages Functions file-based routing convention under app/functions/ doesn't apply
// here, so all three API routes are handled directly in one fetch handler, falling back to
// env.ASSETS for everything else (the built SPA).

import { signToken, verifyToken } from "./_auth";

interface Env {
  ASSETS: Fetcher;
  LOGS: KVNamespace;
  APP_PASSWORD: string;
  APP_TOKEN_SECRET: string;
}

type LogsData = {
  sessions: Record<string, unknown>;
};

const EMPTY: LogsData = { sessions: {} };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

async function handleAuth(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!env.APP_PASSWORD) {
    return json({ error: "APP_PASSWORD no está configurado en el servidor" }, 500);
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body inválido" }, 400);
  }

  if (body.password !== env.APP_PASSWORD) {
    return json({ error: "Contraseña incorrecta" }, 401);
  }

  const token = await signToken(env.APP_TOKEN_SECRET || "dev-secret-change-me");
  return json({ token });
}

async function handleState(request: Request, env: Env): Promise<Response> {
  if (!(await verifyToken(request, env.APP_TOKEN_SECRET || "dev-secret-change-me"))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const data = await env.LOGS.get<LogsData>("logs", "json");
  return json(data || EMPTY);
}

async function handleSave(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!(await verifyToken(request, env.APP_TOKEN_SECRET || "dev-secret-change-me"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response("Body inválido", { status: 400 });
  }

  const { kind, date } = body;
  if (!kind || !date) return new Response("Falta kind o date", { status: 400 });

  const data = (await env.LOGS.get<LogsData>("logs", "json")) || { sessions: { ...EMPTY.sessions } };

  if (kind === "session") {
    data.sessions[date] = body.session;
  } else {
    return new Response("kind desconocido", { status: 400 });
  }

  await env.LOGS.put("logs", JSON.stringify(data));
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
