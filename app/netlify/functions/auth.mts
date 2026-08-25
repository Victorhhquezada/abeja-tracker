import { signToken } from "./_auth.mts";

const PASSWORD = process.env.APP_PASSWORD || "";

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!PASSWORD) {
    return new Response(JSON.stringify({ error: "APP_PASSWORD no está configurado en el servidor" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body inválido" }), { status: 400 });
  }

  if (body.password !== PASSWORD) {
    return new Response(JSON.stringify({ error: "Contraseña incorrecta" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ token: signToken() }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
