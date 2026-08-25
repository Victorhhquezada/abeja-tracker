import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Today from "./pages/Today";
import Week from "./pages/Week";
import Month from "./pages/Month";
import Progress from "./pages/Progress";
import TopBar from "./components/TopBar";
import BottomTabBar, { type Tab } from "./components/BottomTabBar";
import { getToken, clearToken, fetchState } from "./api";
import type { LogsState } from "./types";

const EMPTY_LOGS: LogsState = { sessions: {}, weight: {} };

const TAB_TITLES: Record<Tab, string> = {
  hoy: "Hoy",
  semana: "Semana",
  mes: "Mes",
  progreso: "Progreso",
};

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [tab, setTab] = useState<Tab>("hoy");
  const [logs, setLogs] = useState<LogsState>(EMPTY_LOGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchState();
      setLogs(data);
    } catch (err) {
      if (err instanceof Error && err.message === "unauthorized") {
        setAuthed(false);
      } else {
        setError("No se pudo cargar tu información.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authed) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  // iOS Safari doesn't resize the layout viewport when the keyboard opens, so a
  // focused input near the bottom of the screen can end up hidden behind it.
  // Nudge the focused field into view once the keyboard has finished animating in.
  useEffect(() => {
    function handleFocusIn(e: FocusEvent) {
      const target = e.target as HTMLElement;
      if (!target.matches?.("input, textarea, select")) return;
      window.setTimeout(() => {
        target.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 300);
    }
    document.addEventListener("focusin", handleFocusIn);
    return () => document.removeEventListener("focusin", handleFocusIn);
  }, []);

  function handleLogout() {
    clearToken();
    setAuthed(false);
  }

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="app-shell">
      <TopBar title={TAB_TITLES[tab]} onLogout={handleLogout} />
      {loading && (
        <div className="loading-bar" role="status">
          <span className="sr-only">Cargando...</span>
        </div>
      )}
      <main key={tab} className="tab-content">
        {error && <p className="error">{error}</p>}
        {tab === "hoy" && <Today logs={logs} onRefresh={refresh} />}
        {tab === "semana" && <Week logs={logs} />}
        {tab === "mes" && <Month logs={logs} />}
        {tab === "progreso" && <Progress logs={logs} />}
      </main>
      <BottomTabBar active={tab} onChange={setTab} />
    </div>
  );
}
