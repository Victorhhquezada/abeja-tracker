import { signToken } from "../_auth";

interface Env {
  APP_PASSWORD: string;
  APP_TOKEN_SECRET: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.APP_PASSWORD) {
    return new Response(JSON.stringify({ error: "APP_PASSWORD no está configurado en el servidor" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body inválido" }), { status: 400 });
  }

  if (body.password !== env.APP_PASSWORD) {
    return new Response(JSON.stringify({ error: "Contraseña incorrecta" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const token = await signToken(env.APP_TOKEN_SECRET || "dev-secret-change-me");
  return new Response(JSON.stringify({ token }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
