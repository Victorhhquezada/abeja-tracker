import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCrew, redeemReward } from "../api";
import { ATHLETES, ATHLETE_IDS, getActiveAthlete, type AthleteId } from "../athletes";
import { REWARDS, type Reward } from "../data/rewards";
import {
  athleteStreak,
  computePoints,
  crewTrainingDays,
  spentPoints,
  splitPayment,
  weekPoints,
  weekProgress,
  type PointsSummary,
} from "../points";
import { toISODate } from "../dateUtils";
import StreakCard from "../components/StreakCard";
import YearActivityGraph from "../components/YearActivityGraph";
import type { CrewState, LogsState } from "../types";

function toLogs(crew: CrewState, id: AthleteId): LogsState {
  const data = crew.athletes[id];
  const sessions: LogsState["sessions"] = {};
  for (const [date, s] of Object.entries(data?.sessions ?? {})) {
    sessions[date] = { dayId: "", completed: s.completed, exercises: {} };
  }
  return { sessions, streakProtections: data?.streakProtections ?? [] };
}

type Standing = {
  id: AthleteId;
  points: PointsSummary;
  streak: number;
  week: { done: number; scheduled: number };
  weekPoints: number;
  trainedToday: boolean;
  balance: number;
};

export default function Progress({ logs, onRefresh }: { logs: LogsState; onRefresh: () => void }) {
  const me = getActiveAthlete().id;
  const [crew, setCrew] = useState<CrewState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCrew(await fetchCrew());
      setError(null);
    } catch {
      setError("No se pudo cargar el ranking.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const standings = useMemo<Record<AthleteId, Standing> | null>(() => {
    if (!crew) return null;
    const today = new Date();
    const todayISO = toISODate(today);
    // Mis datos salen de mis registros (siempre frescos); los del otro, de lo que comparte el servidor.
    const allLogs = Object.fromEntries(
      ATHLETE_IDS.map((id) => [id, id === me ? logs : toLogs(crew, id)])
    ) as Record<AthleteId, LogsState>;
    const crewDays = crewTrainingDays(allLogs.abeja, allLogs.oscar);
    return Object.fromEntries(
      ATHLETE_IDS.map((id) => {
        const points = computePoints(id, allLogs[id], crewDays, today);
        return [
          id,
          {
            id,
            points,
            streak: athleteStreak(id, allLogs[id], today),
            week: weekProgress(id, allLogs[id], today),
            weekPoints: weekPoints(points, today),
            trainedToday: !!allLogs[id].sessions[todayISO]?.completed,
            balance: points.earned - spentPoints(id, crew.redemptions),
          },
        ];
      })
    ) as Record<AthleteId, Standing>;
  }, [crew, logs, me]);

  async function handleRedeem(reward: Reward) {
    if (!standings || !crew) return;
    const balances = Object.fromEntries(ATHLETE_IDS.map((id) => [id, standings[id].balance])) as Record<AthleteId, number>;
    const split = splitPayment(reward.cost, !!reward.pooled, me, balances);
    if (!split) return;
    setRedeeming(reward.id);
    try {
      await redeemReward(reward.id, reward.cost, split);
      setNotice(`¡Canjeaste ${reward.name}! Avísale a tu papá para planear la cena 🎉`);
      await load();
    } catch {
      setNotice("No se pudo canjear. Intenta de nuevo.");
    } finally {
      setRedeeming(null);
    }
  }

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!standings || !crew) return <div className="page"><p className="muted">Cargando ranking…</p></div>;

  const ranked = [...ATHLETE_IDS].sort((a, b) => standings[b].points.earned - standings[a].points.earned);
  const [first, second] = ranked;
  const gap = standings[first].points.earned - standings[second].points.earned;
  const mine = standings[me];
  const combinedBalance = ATHLETE_IDS.reduce((sum, id) => sum + standings[id].balance, 0);
  const balances = Object.fromEntries(ATHLETE_IDS.map((id) => [id, standings[id].balance])) as Record<AthleteId, number>;

  return (
    <div className="page">
      <h1>Progreso</h1>

      <section className="card leaderboard">
        <h2>Ranking</h2>
        <p className="muted small rivalry-line">
          {gap === 0
            ? "Empate: nadie va adelante todavía."
            : `${ATHLETES[first].name} lleva ${gap} ${gap === 1 ? "punto" : "puntos"} de ventaja.`}
        </p>
        {ranked.map((id, i) => {
          const s = standings[id];
          return (
            <div key={id} className={`lb-row ${id === me ? "me" : ""}`.trim()}>
              <span className="lb-rank">{i === 0 && gap > 0 ? "🥇" : i + 1}</span>
              <div className="lb-main">
                <strong>{ATHLETES[id].name}</strong>
                <span className="muted small">
                  🔥 {s.streak} · semana {s.week.done}/{s.week.scheduled} · {s.trainedToday ? "hoy entrenó ✓" : "hoy pendiente"}
                </span>
              </div>
              <div className="lb-points">
                <strong>{s.points.earned}</strong>
                <span className="muted small">+{s.weekPoints} esta semana</span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="card points-card">
        <p className="muted small points-label">Tus puntos disponibles</p>
        <div className="points-hero">{mine.balance}</div>
        <div className="points-chips">
          <span className="chip">Multiplicador ×{mine.points.multiplier.toFixed(1)}</span>
          {mine.points.daysToNextBoost != null && (
            <span className="chip muted-chip">
              {mine.points.daysToNextBoost} {mine.points.daysToNextBoost === 1 ? "día" : "días"} de racha para ×
              {(mine.points.multiplier + 0.1).toFixed(1)}
            </span>
          )}
        </div>
        <ul className="points-breakdown">
          <li><span>Sesiones</span><span>{mine.points.sessions}</span></li>
          <li><span>Semanas completas</span><span>{mine.points.weekBonus}</span></li>
          <li><span>Bono por entrenar juntos</span><span>{mine.points.crewBonus}</span></li>
          <li><span>Canjeados</span><span>−{spentPoints(me, crew.redemptions)}</span></li>
        </ul>
        <p className="muted small">
          Cada sesión suma 10 puntos × tu multiplicador de racha. Semana completa +25. Cada día que los dos
          entrenan, +10 para cada uno.
        </p>
      </section>

      <section className="rewards">
        <h2>Premios</h2>
        {notice && <p className="reward-notice">{notice}</p>}
        <div className="reward-grid">
          {REWARDS.map((reward) => {
            const split = splitPayment(reward.cost, !!reward.pooled, me, balances);
            const have = reward.pooled ? combinedBalance : mine.balance;
            const progress = Math.min(1, have / reward.cost);
            const missing = Math.max(0, reward.cost - have);
            return (
              <article key={reward.id} className="reward-card">
                <img className="reward-img" src={reward.image} alt={reward.name} loading="lazy" />
                <div className="reward-body">
                  <div className="reward-head">
                    <strong>{reward.name}</strong>
                    <span className="reward-cost">{reward.cost.toLocaleString("es-MX")} pts</span>
                  </div>
                  {reward.pooled && <span className="muted small">Se paga entre los dos: cuentan los puntos de ambos</span>}
                  <div className="reward-bar" aria-hidden="true">
                    <div className="reward-bar-fill" style={{ width: `${progress * 100}%` }} />
                  </div>
                  <span className="muted small">
                    {missing > 0 ? `Te faltan ${missing.toLocaleString("es-MX")} pts` : "¡Ya alcanza!"}
                  </span>
                  <button
                    type="button"
                    className={`reward-redeem ${split ? "ready" : "locked"}`}
                    disabled={!split || redeeming !== null}
                    aria-label={split ? `Canjear ${reward.name}` : `${reward.name}: aún no alcanzan los puntos`}
                    onClick={() => handleRedeem(reward)}
                  >
                    {redeeming === reward.id ? "Canjeando…" : "Canjear"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        {crew.redemptions.length > 0 && (
          <div className="redeemed-list">
            <h3>Canjeados</h3>
            {[...crew.redemptions].reverse().map((r) => (
              <p key={r.id} className="muted small">
                {REWARDS.find((x) => x.id === r.rewardId)?.name ?? r.rewardId} · {ATHLETES[r.by as AthleteId]?.name ?? r.by} ·{" "}
                {new Date(r.date).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
              </p>
            ))}
          </div>
        )}
      </section>

      <StreakCard logs={logs} onRefresh={onRefresh} />
      <YearActivityGraph logs={logs} />
    </div>
  );
}
