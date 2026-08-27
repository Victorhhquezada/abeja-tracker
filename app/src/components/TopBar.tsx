import { IconLogout } from "./icons";

export default function TopBar({
  title,
  streak,
  onLogout,
}: {
  title: string;
  streak: number;
  onLogout: () => void;
}) {
  return (
    <header className="topbar">
      {streak > 0 ? (
        <span className="streak-badge" aria-label={`Racha de ${streak} sesiones seguidas`}>
          <span aria-hidden="true">🔥</span>
          {streak}
        </span>
      ) : (
        <span className="topbar-spacer" aria-hidden="true" />
      )}
      <span className="topbar-title">{title}</span>
      <button className="btn-icon" onClick={onLogout} aria-label="Salir">
        <IconLogout size={18} />
      </button>
    </header>
  );
}
