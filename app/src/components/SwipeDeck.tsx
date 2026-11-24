import { useEffect, useRef, useState } from "react";
import type { SurveyCard } from "../trainingSchedule";

export type SwipeAnswer = "like" | "dislike";

// Cuánto hay que arrastrar (o cuánto se proyecta con la velocidad del dedo) para que cuente como respuesta.
const COMMIT_DISTANCE = 110;
// Qué tanto de la velocidad suelta del dedo se suma como "inercia" (como el scroll de iOS).
const PROJECTION_SECONDS = 0.18;
const FLY_MS = 260;
const MIN_DRAG = 56;
const MIN_VELOCITY_SPAN_MS = 16;
const MAX_VELOCITY = 2000;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export default function SwipeDeck({
  cards,
  answers,
  onSwipe,
  onUndo,
}: {
  cards: SurveyCard[];
  /** respuestas dadas hasta ahora, en orden: la siguiente tarjeta es cards[answers.length] */
  answers: SwipeAnswer[];
  onSwipe: (answer: SwipeAnswer) => void;
  onUndo: () => void;
}) {
  const index = answers.length;
  const current = cards[index];
  const cardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startY: number; id: number; samples: { x: number; t: number }[] } | null>(null);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<SwipeAnswer | null>(null);

  const reduced = prefersReducedMotion();

  function commit(answer: SwipeAnswer) {
    if (leaving || !current) return;
    setLeaving(answer);
    setDragging(false);
    const width = (cardRef.current?.parentElement?.clientWidth ?? 360) + 120;
    setDx(answer === "like" ? width : -width);
    window.setTimeout(
      () => {
        onSwipe(answer);
        setLeaving(null);
        setDx(0);
      },
      reduced ? 60 : FLY_MS
    );
  }

  function onPointerDown(e: React.PointerEvent) {
    if (leaving) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* puntero ya no activo: se sigue sin captura */
    }
    drag.current = { startX: e.clientX, startY: e.clientY, id: e.pointerId, samples: [{ x: e.clientX, t: performance.now() }] };
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    d.samples.push({ x: e.clientX, t: performance.now() });
    if (d.samples.length > 6) d.samples.shift();
    setDx(e.clientX - d.startX);
  }

  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    // Con muy pocas muestras o un intervalo diminuto la velocidad no es confiable (da valores absurdos): se ignora.
    const span = last.t - first.t;
    const rawVelocity = span >= MIN_VELOCITY_SPAN_MS ? ((last.x - first.x) / span) * 1000 : 0; // px/s
    const velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, rawVelocity));
    // Se decide por hacia dónde VA el gesto, no solo por dónde se soltó: un empujón corto y rápido también cuenta,
    // pero siempre hace falta un mínimo de desplazamiento real.
    const projected = dx + velocity * PROJECTION_SECONDS;
    setDragging(false);
    if (Math.abs(dx) >= MIN_DRAG && Math.abs(projected) >= COMMIT_DISTANCE) commit(projected > 0 ? "like" : "dislike");
    else setDx(0);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") commit("like");
      else if (e.key === "ArrowLeft") commit("dislike");
      else if (e.key === "Backspace" && index > 0 && !leaving) onUndo();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!current) return null;

  const strength = Math.min(1, Math.abs(dx) / COMMIT_DISTANCE);
  const tilt = reduced ? 0 : Math.max(-18, Math.min(18, dx / 14));
  const next = cards[index + 1];
  const after = cards[index + 2];
  const days = [...new Set(current.days)].join(" y ");

  return (
    <div className="swipe-wrap">
      <p className="muted small swipe-counter">
        {index + 1} de {cards.length}
      </p>
      <div className="swipe-stage">
        {after && <div className="swipe-card swipe-card-back swipe-card-back-2" aria-hidden="true" />}
        {next && (
          <div
            className="swipe-card swipe-card-back"
            aria-hidden="true"
            style={{ transform: `scale(${0.94 + strength * 0.06}) translateY(${(1 - strength) * 10}px)` }}
          >
            <h2>{next.exercise}</h2>
          </div>
        )}
        <div
          ref={cardRef}
          className={`swipe-card swipe-card-front ${dragging ? "dragging" : ""} ${leaving ? "leaving" : ""}`.trim()}
          style={{ transform: `translateX(${dx}px) rotate(${tilt}deg)` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="swipe-stamp swipe-stamp-like" style={{ opacity: dx > 0 ? strength : 0 }}>
            ME GUSTA
          </span>
          <span className="swipe-stamp swipe-stamp-nope" style={{ opacity: dx < 0 ? strength : 0 }}>
            NO
          </span>
          <p className="swipe-day">{days}</p>
          <h2>{current.exercise}</h2>
          <p className="swipe-detail">{current.detail}</p>
          {current.summary && <p className="swipe-summary">{current.summary}</p>}
          <p className="muted small swipe-focus">{current.focus}</p>
        </div>
      </div>

      <div className="swipe-actions">
        <button type="button" className="swipe-btn swipe-btn-nope" onClick={() => commit("dislike")} aria-label="No me gustó">
          ✕
        </button>
        <button type="button" className="swipe-btn swipe-btn-undo" onClick={onUndo} disabled={index === 0 || !!leaving} aria-label="Deshacer">
          ↶
        </button>
        <button type="button" className="swipe-btn swipe-btn-like" onClick={() => commit("like")} aria-label="Me gustó">
          ♥
        </button>
      </div>
      <p className="muted small swipe-hint">Desliza a la derecha si te gustó, a la izquierda si no</p>
    </div>
  );
}
