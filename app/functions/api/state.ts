import { verifyToken } from "../_auth";

interface Env {
  LOGS: KVNamespace;
  APP_TOKEN_SECRET: string;
}

type LogsData = {
  sessions: Record<string, unknown>;
};

const EMPTY: LogsData = { sessions: {} };

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await verifyToken(request, env.APP_TOKEN_SECRET || "dev-secret-change-me"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const data = await env.LOGS.get<LogsData>("logs", "json");

  return new Response(JSON.stringify(data || EMPTY), {
    headers: { "content-type": "application/json" },
  });
};
