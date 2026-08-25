import { IconToday, IconWeek, IconMonth, IconProgress } from "./icons";

export type Tab = "hoy" | "semana" | "mes" | "progreso";

const TABS: { id: Tab; label: string; Icon: typeof IconToday }[] = [
  { id: "hoy", label: "Hoy", Icon: IconToday },
  { id: "semana", label: "Semana", Icon: IconWeek },
  { id: "mes", label: "Mes", Icon: IconMonth },
  { id: "progreso", label: "Progreso", Icon: IconProgress },
];

export default function BottomTabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={t.id === active ? "tabbar-item active" : "tabbar-item"}
          onClick={() => onChange(t.id)}
        >
          <t.Icon />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
