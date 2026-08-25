import { useId } from "react";

export default function LineChart({
  points,
  width = 600,
  height = 220,
  color = "var(--accent)",
  unit = "",
}: {
  points: { x: string; y: number }[];
  width?: number;
  height?: number;
  color?: string;
  unit?: string;
}) {
  const gradientId = useId();

  if (points.length === 0) {
    return <p className="muted">Sin datos todavía.</p>;
  }

  const padding = 32;
  const ys = points.map((p) => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const range = maxY - minY || 1;

  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = padding + i * stepX;
    const y = height - padding - ((p.y - minY) / range) * (height - padding * 2);
    return { x, y, label: p.x, value: p.y };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const baseline = height - padding;
  const areaPath =
    coords.length > 1
      ? `${path} L${coords[coords.length - 1].x.toFixed(1)},${baseline} L${coords[0].x.toFixed(1)},${baseline} Z`
      : "";

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="line-chart">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {areaPath && <path className="chart-area" d={areaPath} fill={`url(#${gradientId})`} stroke="none" />}
      <path
        className="chart-line"
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {coords.map((c, i) => (
        <g key={i} className="chart-dot">
          <circle cx={c.x} cy={c.y} r={3.5} fill={color} stroke="var(--card)" strokeWidth={1.5} />
          <title>
            {c.label}: {c.value}
            {unit}
          </title>
        </g>
      ))}
      <text x={padding} y={height - 8} fontSize={10} fill="var(--muted)">
        {points[0].x}
      </text>
      <text x={width - padding} y={height - 8} fontSize={10} fill="var(--muted)" textAnchor="end">
        {points[points.length - 1].x}
      </text>
      <text x={padding} y={16} fontSize={10} fill="var(--muted)">
        {maxY}
        {unit}
      </text>
      <text x={padding} y={height - padding + 14} fontSize={10} fill="var(--muted)">
        {minY}
        {unit}
      </text>
    </svg>
  );
}
