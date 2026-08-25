import { IconLogout } from "./icons";

export default function TopBar({ title, onLogout }: { title: string; onLogout: () => void }) {
  return (
    <header className="topbar">
      <span className="topbar-spacer" aria-hidden="true" />
      <span className="topbar-title">{title}</span>
      <button className="btn-icon" onClick={onLogout} aria-label="Salir">
        <IconLogout size={18} />
      </button>
    </header>
  );
}
