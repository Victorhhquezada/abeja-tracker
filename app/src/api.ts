import type { LogsState, SessionLog, CycleSurveyResponse } from "./types";

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

  // keepalive lets the request finish even if the tab is backgrounded or the phone
  // locks right after tapping "Marcar sesión completa" — a save otherwise gets
  // silently killed mid-flight on iOS Safari with no error shown to the user.
  const attempt = () => fetch(path, { ...options, headers, keepalive: true });

  let res: Response;
  try {
    res = await attempt();
  } catch {
    // The request itself got dropped (not a server error response, but a network/connection
    // failure — e.g. the phone lost signal or suspended the tab mid-request). One short, silent
    // retry turns many of these transient drops into a success instead of forcing the user to
    // notice the failure and tap the button again themselves.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    res = await attempt();
  }

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
    keepalive: true,
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

export async function activateStreakProtection(date: string) {
  const res = await authFetch("/api/save", {
    method: "POST",
    body: JSON.stringify({ kind: "protection", date }),
  });
  if (!res.ok) throw new Error("Error activando la protección");
  return res.json();
}

export async function submitCycleSurvey(blockId: string, response: CycleSurveyResponse) {
  const res = await authFetch("/api/save", {
    method: "POST",
    body: JSON.stringify({ kind: "survey", blockId, response }),
  });
  if (!res.ok) throw new Error("Error guardando la encuesta");
  return res.json();
}


export async function saveSparring(date: string, sparred: boolean) {
  const res = await authFetch("/api/save", {
    method: "POST",
    body: JSON.stringify({ kind: "sparring", date, sparred }),
  });
  if (!res.ok) throw new Error("Error guardando la respuesta de sparring");
  return res.json();
}
