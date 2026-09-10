import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Today from "./pages/Today";
import Week from "./pages/Week";
import Month from "./pages/Month";
import Progress from "./pages/Progress";
import TopBar from "./components/TopBar";
import BottomTabBar, { type Tab } from "./components/BottomTabBar";
import { getToken, clearToken, fetchState } from "./api";
import { computeStreak } from "./trainingSchedule";
import type { LogsState } from "./types";

const EMPTY_LOGS: LogsState = { sessions: {} };

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
  // Uses an instant jump, not smooth scrolling: animating the scroll while the
  // keyboard is also animating in/out is what triggers a known WebKit bug where
  // position:fixed elements (the bottom tab bar) visually detach and freeze at
  // a stale offset until something forces a reflow.
  useEffect(() => {
    function handleFocusIn(e: FocusEvent) {
      const target = e.target as HTMLElement;
      if (!target.matches?.("input, textarea, select")) return;
      window.setTimeout(() => {
        target.scrollIntoView({ block: "center", behavior: "auto" });
      }, 300);
    }
    document.addEventListener("focusin", handleFocusIn);
    return () => document.removeEventListener("focusin", handleFocusIn);
  }, []);

  // Belt-and-suspenders for the same bug: once a field loses focus (keyboard
  // starts dismissing), re-set the scroll position to itself shortly after.
  // This is a no-op visually but forces Safari to recompute fixed-position
  // layout, so the tab bar can't stay stuck floating mid-page if the bug did
  // trigger.
  useEffect(() => {
    function handleFocusOut(e: FocusEvent) {
      const target = e.target as HTMLElement;
      if (!target.matches?.("input, textarea, select")) return;
      window.setTimeout(() => {
        window.scrollTo(window.scrollX, window.scrollY);
      }, 350);
    }
    document.addEventListener("focusout", handleFocusOut);
    return () => document.removeEventListener("focusout", handleFocusOut);
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
      <TopBar title={TAB_TITLES[tab]} streak={computeStreak(logs)} onLogout={handleLogout} />
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
