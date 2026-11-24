import { useState } from "react";
import type { TrainingBlock, CycleSurveyResponse, SurveyFeeling } from "../types";
import { getSurveyCards } from "../trainingSchedule";
import { submitCycleSurvey } from "../api";
import { CAPABILITY_QUESTIONS, FEELING_OPTIONS } from "../data/cycleSurveyQuestions";
import SwipeDeck, { type SwipeAnswer } from "./SwipeDeck";

type Step = "swipe" | "feelings";

export default function CycleSurveyModal({
  block,
  onClose,
  onSubmitted,
}: {
  block: TrainingBlock;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const cards = getSurveyCards(block);
  const surveyKey = block.surveyId ?? block.id;

  const [step, setStep] = useState<Step>("swipe");
  const [answers, setAnswers] = useState<SwipeAnswer[]>([]);
  const [feelings, setFeelings] = useState<Record<string, SurveyFeeling>>({});
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const swipesDone = answers.length >= cards.length;
  const allFeelingsAnswered = CAPABILITY_QUESTIONS.every((q) => feelings[q.key] != null);
  const canSubmit = swipesDone && allFeelingsAnswered && !saving;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const swipes: Record<string, SwipeAnswer> = {};
      cards.forEach((card, i) => {
        swipes[card.exercise] = answers[i];
      });
      const response: CycleSurveyResponse = {
        blockId: surveyKey,
        submittedAt: new Date().toISOString(),
        swipes,
        feelings,
        comments: comments.trim() || undefined,
      };
      await submitCycleSurvey(surveyKey, response);
      onSubmitted();
    } catch {
      setError("Error guardando la encuesta. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="survey-fullscreen">
      <header className="survey-header">
        <h1>Encuesta — fin de {block.label}</h1>
        <button className="btn-icon survey-close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
      </header>

      {step === "swipe" && (
        <div className="survey-swipe-step">
          {!swipesDone ? (
            <SwipeDeck
              cards={cards}
              answers={answers}
              onSwipe={(a) => setAnswers((prev) => [...prev, a])}
              onUndo={() => setAnswers((prev) => prev.slice(0, -1))}
            />
          ) : (
            <div className="swipe-done">
              <h2>¡Listo con los ejercicios!</h2>
              <p className="muted">
                Te gustaron {answers.filter((a) => a === "like").length} de {cards.length}.
              </p>
              <button className="complete-btn" onClick={() => setStep("feelings")}>
                Continuar
              </button>
              <button className="btn-outline" onClick={() => setAnswers((prev) => prev.slice(0, -1))}>
                ↶ Deshacer el último
              </button>
            </div>
          )}
        </div>
      )}

      {step === "feelings" && (
        <div className="survey-scroll">
          <section className="survey-section">
            <h2>Cómo te sientes</h2>
            <p className="muted small">Contra como empezaste este bloque · al enviar ganas +10 puntos</p>
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
            {saving ? "Guardando..." : "Enviar encuesta (+10 puntos)"}
          </button>
          {!allFeelingsAnswered && !saving && (
            <p className="muted small survey-submit-hint">Faltan: responder cómo te sientes</p>
          )}
          <button className="btn-outline survey-back" onClick={() => setStep("swipe")}>
            ← Volver a los ejercicios
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      )}
    </div>
  );
}
