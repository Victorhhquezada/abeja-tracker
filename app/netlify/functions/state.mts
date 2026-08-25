import { getStore } from "@netlify/blobs";
import { verifyToken } from "./_auth.mts";

type LogsData = {
  sessions: Record<string, unknown>;
};

const EMPTY: LogsData = { sessions: {} };

export default async (req: Request) => {
  if (!verifyToken(req)) return new Response("Unauthorized", { status: 401 });

  const store = getStore("boxer-tracker");
  const data = (await store.get("logs", { type: "json" })) as LogsData | null;

  return new Response(JSON.stringify(data || EMPTY), {
    headers: { "content-type": "application/json" },
  });
};
