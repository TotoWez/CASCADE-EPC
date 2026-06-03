export interface ChartPoint {
  label: string; // date label
  pct: number;
}

/** SVG progress-over-time chart: gridlines, area fill, line, markers. */
export function ProgressChart({ points }: { points: ChartPoint[] }) {
  const W = 480, H = 200, padL = 34, padR = 12, padT = 14, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = points.length;
  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (pct: number) => padT + innerH * (1 - pct / 100);

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.pct)}`).join(" ");
  const areaPath = `${linePath} L ${x(n - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;

  const first = points[0]?.pct ?? 0;
  const last = points[n - 1]?.pct ?? 0;
  const change = last - first;

  return (
    <div className="rounded border border-line bg-canvas p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={padL} y1={y(g)} x2={W - padR} y2={y(g)} stroke="rgb(var(--line))" strokeWidth={1} />
            <text x={padL - 6} y={y(g) + 3} textAnchor="end" className="fill-ink-mute font-mono" fontSize="9">{g}</text>
          </g>
        ))}
        <path d={areaPath} fill="#0057FF" opacity={0.12} />
        <path d={linePath} fill="none" stroke="#0057FF" strokeWidth={2} />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.pct)} r={3} fill="#0057FF" />
            <text x={x(i)} y={y(p.pct) - 7} textAnchor="middle" className="fill-ink font-mono" fontSize="9">{p.pct}%</text>
            <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-ink-mute font-mono" fontSize="8">{p.label}</text>
          </g>
        ))}
      </svg>
      <p className="mt-1 text-center font-mono text-2xs text-ink-mute">
        {first}% → {last}% ·{" "}
        <span className={change > 0 ? "text-brand-green" : change < 0 ? "text-status-blocked" : "text-ink-mute"}>
          {change > 0 ? "+" : ""}{change}%
        </span>
      </p>
    </div>
  );
}
