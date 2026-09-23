import type { TrainingBlock } from "../types";

export default function SurveyPendingBanner({ block, onOpen }: { block: TrainingBlock; onOpen: () => void }) {
  return (
    <button className="survey-banner" onClick={onOpen}>
      <span className="survey-banner-icon" aria-hidden="true">
        📋
      </span>
      <span className="survey-banner-text">
        <strong>Encuesta de fin de ciclo</strong>
        <span className="muted small">{block.label} terminó — cuéntanos qué te pareció</span>
      </span>
      <span className="survey-banner-arrow" aria-hidden="true">
        →
      </span>
    </button>
  );
}
