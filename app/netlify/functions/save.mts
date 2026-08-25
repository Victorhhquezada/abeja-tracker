import { getStore } from "@netlify/blobs";
import { verifyToken } from "./_auth.mts";

type LogsData = {
  sessions: Record<string, unknown>;
  weight: Record<string, number>;
};

const EMPTY: LogsData = { sessions: {}, weight: {} };

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!verifyToken(req)) return new Response("Unauthorized", { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response("Body inválido", { status: 400 });
  }

  const { kind, date } = body;
  if (!kind || !date) return new Response("Falta kind o date", { status: 400 });

  const store = getStore("boxer-tracker");
  const data = ((await store.get("logs", { type: "json" })) as LogsData | null) || {
    sessions: { ...EMPTY.sessions },
    weight: { ...EMPTY.weight },
  };

  if (kind === "session") {
    data.sessions[date] = body.session;
  } else if (kind === "weight") {
    if (typeof body.weightKg !== "number") return new Response("weightKg inválido", { status: 400 });
    data.weight[date] = body.weightKg;
  } else {
    return new Response("kind desconocido", { status: 400 });
  }

  await store.setJSON("logs", data);

  return new Response(JSON.stringify({ ok: true, data }), {
    headers: { "content-type": "application/json" },
  });
};
