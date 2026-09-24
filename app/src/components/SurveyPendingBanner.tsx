import { toISODate } from "../dateUtils";
import type { TrainingBlock } from "../types";

export default function SurveyPendingBanner({
  block,
  today,
  onOpen,
}: {
  block: TrainingBlock;
  today: Date;
  onOpen: () => void;
}) {
  const todayISO = toISODate(today);
  const deadlineLabel = new Date(`${block.endDate}T00:00:00`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
  });
  const subtitle =
    todayISO < block.endDate
      ? `Responde antes del ${deadlineLabel}, cuando empieza el próximo bloque`
      : `${block.label} terminó — cuéntanos qué te pareció`;

  return (
    <button className="survey-banner" onClick={onOpen}>
      <span className="survey-banner-icon" aria-hidden="true">
        📋
      </span>
      <span className="survey-banner-text">
        <strong>Encuesta de fin de ciclo</strong>
        <span className="muted small">{subtitle}</span>
      </span>
      <span className="survey-banner-arrow" aria-hidden="true">
        →
      </span>
    </button>
  );
}
