import { verifyToken } from "../_auth";

interface Env {
  LOGS: KVNamespace;
  APP_TOKEN_SECRET: string;
}

type LogsData = {
  sessions: Record<string, unknown>;
};

const EMPTY: LogsData = { sessions: {} };

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
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

  return new Response(JSON.stringify({ ok: true, data }), {
    headers: { "content-type": "application/json" },
  });
};
