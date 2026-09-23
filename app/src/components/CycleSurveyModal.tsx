import { useState } from "react";
import type { TrainingBlock, CycleSurveyResponse, SurveyFeeling } from "../types";
import { getAllExercisesForBlock } from "../trainingSchedule";
import { submitCycleSurvey } from "../api";
import { CAPABILITY_QUESTIONS, FEELING_OPTIONS, RATING_OPTIONS } from "../data/cycleSurveyQuestions";

const PICKS_REQUIRED = 3;

export default function CycleSurveyModal({
  block,
  onClose,
  onSubmitted,
}: {
  block: TrainingBlock;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const exercises = getAllExercisesForBlock(block);
  const exerciseNames = exercises.map((e) => e.exercise);

  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [leastFavorites, setLeastFavorites] = useState<string[]>([]);
  const [feelings, setFeelings] = useState<Record<string, SurveyFeeling>>({});
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleFavorite(exercise: string) {
    setFavorites((prev) => {
      if (prev.includes(exercise)) return prev.filter((e) => e !== exercise);
      if (prev.length >= PICKS_REQUIRED) return prev;
      return [...prev, exercise];
    });
  }

  function toggleLeastFavorite(exercise: string) {
    setLeastFavorites((prev) => {
      if (prev.includes(exercise)) return prev.filter((e) => e !== exercise);
      if (prev.length >= PICKS_REQUIRED) return prev;
      return [...prev, exercise];
    });
  }

  const allRated = exerciseNames.every((name) => ratings[name] != null);
  const favoritesDone = favorites.length === PICKS_REQUIRED;
  const leastFavoritesDone = leastFavorites.length === PICKS_REQUIRED;
  const allFeelingsAnswered = CAPABILITY_QUESTIONS.every((q) => feelings[q.key] != null);
  const canSubmit = allRated && favoritesDone && leastFavoritesDone && allFeelingsAnswered && !saving;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const response: CycleSurveyResponse = {
        blockId: block.id,
        submittedAt: new Date().toISOString(),
        exerciseRatings: ratings,
        favorites,
        leastFavorites,
        feelings,
        comments: comments.trim() || undefined,
      };
      await submitCycleSurvey(block.id, response);
      onSubmitted();
    } catch {
      setError("Error guardando la encuesta. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  // Agrupa los ejercicios por día conservando el orden, para mostrar un encabezado
  // por día en vez de una lista plana de 20 ejercicios.
  const groupedByDay: { dayLabel: string; exercises: string[] }[] = [];
  for (const item of exercises) {
    const group = groupedByDay.find((g) => g.dayLabel === item.dayLabel);
    if (group) group.exercises.push(item.exercise);
    else groupedByDay.push({ dayLabel: item.dayLabel, exercises: [item.exercise] });
  }

  return (
    <div className="survey-fullscreen">
      <header className="survey-header">
        <h1>Encuesta — fin de {block.label}</h1>
        <button className="btn-icon survey-close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
      </header>

      <div className="survey-scroll">
        <section className="survey-section">
          <h2>¿Qué tanto te gustó cada ejercicio?</h2>
          <p className="muted small">1 = no me gustó nada · 5 = me encantó</p>
          {groupedByDay.map((group) => (
            <div className="survey-day-group" key={group.dayLabel}>
              <h3>{group.dayLabel}</h3>
              {group.exercises.map((name) => (
                <div className="survey-rating-row" key={name}>
                  <span className="survey-exercise-name">{name}</span>
                  <div className="weight-choice-group">
                    {RATING_OPTIONS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`weight-choice-btn ${ratings[name] === n ? "selected" : ""}`.trim()}
                        onClick={() => setRatings((prev) => ({ ...prev, [name]: n }))}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>

        <section className="survey-section">
          <h2>Tus 3 ejercicios favoritos</h2>
          <p className="muted small">Se quedan seguro en el próximo ciclo — {favorites.length}/{PICKS_REQUIRED} elegidos</p>
          <div className="survey-chip-list">
            {exerciseNames.map((name) => (
              <button
                key={name}
                type="button"
                className={`survey-chip ${favorites.includes(name) ? "selected" : ""}`.trim()}
                disabled={leastFavorites.includes(name)}
                onClick={() => toggleFavorite(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </section>

        <section className="survey-section">
          <h2>Los 3 que más se te hicieron aburridos o pesados</h2>
          <p className="muted small">Esos son los que cambiamos — {leastFavorites.length}/{PICKS_REQUIRED} elegidos</p>
          <div className="survey-chip-list">
            {exerciseNames.map((name) => (
              <button
                key={name}
                type="button"
                className={`survey-chip ${leastFavorites.includes(name) ? "selected" : ""}`.trim()}
                disabled={favorites.includes(name)}
                onClick={() => toggleLeastFavorite(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </section>

        <section className="survey-section">
          <h2>Cómo te sientes físicamente</h2>
          {CAPABILITY_QUESTIONS.map((q) => (
            <div className="survey-rating-row survey-feeling-row" key={q.key}>
              <span className="survey-exercise-name">{q.label}</span>
              <div className="survey-feeling-group">
                {FEELING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`weight-choice-btn ${feelings[q.key] === opt.value ? "selected" : ""}`.trim()}
                    onClick={() => setFeelings((prev) => ({ ...prev, [q.key]: opt.value }))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="survey-section">
          <h2>¿Algo que quieras agregar?</h2>
          <p className="muted small">Molestias, lesiones, algo que quieras probar el próximo ciclo (opcional)</p>
          <textarea
            className="notes"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Opcional..."
          />
        </section>

        <button className="complete-btn survey-submit-btn" onClick={handleSubmit} disabled={!canSubmit}>
          {saving ? "Guardando..." : "Enviar encuesta"}
        </button>
        {!canSubmit && !saving && (
          <p className="muted small survey-submit-hint">
            Faltan: {!allRated && "calificar todos los ejercicios"}
            {!allRated && (!favoritesDone || !leastFavoritesDone || !allFeelingsAnswered) && ", "}
            {!favoritesDone && `elegir ${PICKS_REQUIRED} favoritos`}
            {!favoritesDone && (!leastFavoritesDone || !allFeelingsAnswered) && ", "}
            {!leastFavoritesDone && `elegir ${PICKS_REQUIRED} aburridos`}
            {!leastFavoritesDone && !allFeelingsAnswered && ", "}
            {!allFeelingsAnswered && "responder cómo te sientes"}
          </p>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
