import { useMemo, useState, type MouseEvent } from "react";
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { useWidth } from "./YearClock";
import { format, longDate, type Day, type Reading } from "./data";

const SERIES: { key: Reading; name: string; color: string }[] = [
  { key: "pm10", name: "PM10", color: "var(--pm10)" },
  { key: "pm25", name: "PM2.5", color: "var(--pm25)" },
];

// Trailing mean, like pandas' rolling(window).mean(): empty until the window fills.
function rolling(values: number[], span: number) {
  let sum = 0;
  return values.map((v, i) => {
    sum += v;
    if (i >= span) sum -= values[i - span];
    return i >= span - 1 ? sum / span : null;
  });
}

export default function Smoothing({ days, selected, onSelect }: { days: Day[]; selected: number; onSelect: (i: number) => void }) {
  const [span, setSpan] = useState(14);
  const [hover, setHover] = useState<number | null>(null);
  const [frame, width] = useWidth(900);
  const height = 300, left = 34, right = 10, top = 10, bottom = 38;
  const x = scaleLinear().domain([0, days.length - 1]).range([left, width - right]);
  const y = scaleLinear().domain([0, Math.max(...days.map(d => d.pm10))]).range([height - bottom, top]).nice();
  const smooth = useMemo(() => SERIES.map(s => rolling(days.map(d => d[s.key]), span)), [days, span]);
  const path = line<number | null>().defined(v => v !== null).x((_, i) => x(i)).y(v => y(v ?? 0));
  const months = days.map((d, i) => [d, i] as const).filter(([d]) => d.date.endsWith("-01"));
  const focus = hover ?? selected;

  function toIndex(e: MouseEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(days.length - 1, Math.round(x.invert(e.clientX - box.left))));
  }

  return (
    <div className="panel" style={{ display: "grid", gap: 12 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="legend">
          {SERIES.map(s => <span key={s.key}><i className="swatch" style={{ background: s.color }} />{s.name}</span>)}
          <span><i className="swatch" style={{ background: "var(--poor)" }} />poor day</span>
        </div>
        <label className="row small" style={{ minWidth: 260, flex: "0 1 360px" }}>
          <span className="muted" style={{ whiteSpace: "nowrap" }}>Smooth over</span>
          <input type="range" min={1} max={60} value={span} onChange={e => setSpan(Number(e.target.value))} style={{ flex: 1, width: "auto" }} />
          <b style={{ minWidth: 64, textAlign: "right" }}>{span === 1 ? "no smoothing" : `${span} days`}</b>
        </label>
      </div>
      <div className="chart-frame" ref={frame}>
        <svg className="chart" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img"
          aria-label={`PM10 and PM2.5 through 2025 with a ${span}-day rolling mean`}
          onPointerMove={e => setHover(toIndex(e))} onPointerLeave={() => setHover(null)} onClick={e => onSelect(toIndex(e))}
          style={{ cursor: "pointer" }}>
          <g className="grid">{y.ticks(4).map(t => <line key={t} x1={left} x2={width - right} y1={y(t)} y2={y(t)} />)}</g>
          {y.ticks(4).map(t => <text key={t} x={left - 6} y={y(t)} dy="0.35em" textAnchor="end">{t}</text>)}
          {months.map(([d, i]) => <text key={d.date} x={x(i)} y={height - 8}>{new Date(`${d.date}T12:00:00`).toLocaleDateString("en-IE", { month: "short" })}</text>)}
          {days.map((d, i) => d.poor ? <rect key={d.date} x={x(i) - 1} y={height - bottom + 4} width={2.2} height={9} fill="var(--poor)" /> : null)}
          {SERIES.map((s, si) => (
            <g key={s.key}>
              {span > 1 && <path d={path(days.map(d => d[s.key])) ?? ""} fill="none" stroke={s.color} strokeOpacity={0.22} strokeWidth={1} />}
              <path d={path(smooth[si]) ?? ""} fill="none" stroke={s.color} strokeWidth={span > 1 ? 2.4 : 1.2} />
            </g>
          ))}
          <line x1={x(focus)} x2={x(focus)} y1={top} y2={height - bottom} stroke="var(--ink)" strokeOpacity={0.5} />
        </svg>
        <div className="tooltip" style={{ left: x(focus), top: top + 4, transform: `translate(${focus > days.length * 0.8 ? "-100%" : focus < days.length * 0.2 ? "0" : "-50%"}, 0)` }}>
          <b>{longDate(days[focus].date)}</b>{days[focus].poor ? " · poor" : ""}<br />
          {SERIES.map((s, si) => (
            <span key={s.key}>{s.name} {format(s.key, days[focus][s.key])}{span > 1 && smooth[si][focus] !== null ? `, ${span}-day mean ${smooth[si][focus]!.toFixed(1)}` : ""}<br /></span>
          ))}
        </div>
      </div>
      <p className="small muted">
        With no smoothing, day-to-day noise hides the pattern. Averaged over two weeks, as in the notebook, both particle sizes fall from May to September and
        climb back through the autumn. Push the window further and the dips and spikes flatten into a single seasonal wave.
      </p>
    </div>
  );
}
