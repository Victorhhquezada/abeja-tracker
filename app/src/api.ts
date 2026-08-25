import type { LogsState, SessionLog } from "./types";

const TOKEN_KEY = "ht_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (options.body) headers["Content-Type"] = "application/json";

  const res = await fetch(path, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    throw new Error("unauthorized");
  }
  return res;
}

export async function login(password: string): Promise<void> {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Contraseña incorrecta");
  }
  const { token } = await res.json();
  setToken(token);
}

export async function fetchState(): Promise<LogsState> {
  const res = await authFetch("/api/state");
  if (!res.ok) throw new Error("Error cargando datos");
  return res.json();
}

export async function saveSession(date: string, session: SessionLog) {
  const res = await authFetch("/api/save", {
    method: "POST",
    body: JSON.stringify({ kind: "session", date, session }),
  });
  if (!res.ok) throw new Error("Error guardando sesión");
  return res.json();
}

export async function saveWeight(date: string, weightKg: number) {
  const res = await authFetch("/api/save", {
    method: "POST",
    body: JSON.stringify({ kind: "weight", date, weightKg }),
  });
  if (!res.ok) throw new Error("Error guardando peso");
  return res.json();
}
