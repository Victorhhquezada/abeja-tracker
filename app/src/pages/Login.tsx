import { useState } from "react";
import { login } from "../api";
import { ATHLETES, ATHLETE_IDS, storedAthleteId, type AthleteId } from "../athletes";

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [athleteId, setAthleteId] = useState<AthleteId>(storedAthleteId);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const athlete = ATHLETES[athleteId];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(athleteId, password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      {athlete.beeBrand && <div className="login-bee-mark" aria-hidden="true" />}
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className={athlete.beeBrand ? "wordmark" : undefined}>{athlete.name}</h1>
        <p className="muted">Fuerza y potencia · acceso privado</p>
        <div className="weight-choice-group athlete-picker" role="group" aria-label="¿Quién eres?">
          {ATHLETE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`weight-choice-btn ${id === athleteId ? "selected" : ""}`.trim()}
              onClick={() => {
                setAthleteId(id);
                setError(null);
              }}
            >
              {ATHLETES[id].name}
            </button>
          ))}
        </div>
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading || !password}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
