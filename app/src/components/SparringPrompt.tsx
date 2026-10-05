export default function SparringPrompt({
  compact = false,
  saving,
  onAnswer,
}: {
  compact?: boolean;
  saving: boolean;
  onAnswer: (sparred: boolean) => void;
}) {
  return (
    <section className="card sparring-prompt">
      <h2>¿Hiciste sparring hoy? 🥊</h2>
      <p className="muted">
        {compact
          ? "Solo para llevar el registro — hoy no hay rutina."
          : "Si sí, la rutina de hoy se aligera: menos series y sin subir peso. Si no, haces la rutina completa."}
      </p>
      <div className="sparring-choice-row">
        <button type="button" className="sparring-btn" disabled={saving} onClick={() => onAnswer(true)}>
          Sí, hice sparring
        </button>
        <button type="button" className="sparring-btn" disabled={saving} onClick={() => onAnswer(false)}>
          No
        </button>
      </div>
    </section>
  );
}
