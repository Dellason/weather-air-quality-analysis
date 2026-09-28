import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { scaleLinear } from "d3-scale";
import { format, label, longDate, type Day, type Reading } from "./data";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function useWidth(fallback = 560) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))));
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return [setNode, width] as const;
}

export default function YearClock({ days, selected, onSelect, reading }: {
  days: Day[];
  selected: number;
  onSelect: (i: number) => void;
  reading: Reading;
}) {
  const [frame, width] = useWidth(600);
  const dragging = useRef(false);
  const size = Math.min(width, 640);
  const c = size / 2;
  const outer = c - 28;
  const inner = outer * 0.44;
  const n = days.length;
  const angle = (i: number) => (i / n) * Math.PI * 2 - Math.PI / 2;
  const max = Math.max(...days.map(d => d[reading]));
  const r = scaleLinear().domain([0, max]).range([inner + 4, outer]);
  const stroke = Math.max(1.1, ((2 * Math.PI * (inner + outer)) / 2 / n) * 0.72);
  const monthStart = MONTHS.map((_, m) => days.findIndex(d => Number(d.date.slice(5, 7)) === m + 1));
  const day = days[selected];

  function pick(e: PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - box.left - box.width / 2;
    const y = e.clientY - box.top - box.height / 2;
    let a = Math.atan2(y, x) + Math.PI / 2;
    if (a < 0) a += Math.PI * 2;
    onSelect(Math.min(n - 1, Math.floor((a / (Math.PI * 2)) * n)));
  }

  function onKey(e: KeyboardEvent<SVGSVGElement>) {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 7, PageDown: -7 }[e.key];
    if (step) { e.preventDefault(); onSelect((selected + step + n) % n); }
    if (e.key === "Home") { e.preventDefault(); onSelect(0); }
    if (e.key === "End") { e.preventDefault(); onSelect(n - 1); }
  }

  return (
    <div className="clock" ref={frame} style={{ maxWidth: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        role="slider" tabIndex={0} aria-label={`Day of 2025, bars show ${label(reading).label}`}
        aria-valuemin={1} aria-valuemax={n} aria-valuenow={selected + 1}
        aria-valuetext={`${longDate(day.date)}: ${day.poor ? "poor" : "good"} air, ${label(reading).label} ${format(reading, day[reading])}`}
        onKeyDown={onKey}
        onPointerDown={e => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); pick(e); }}
        onPointerMove={e => dragging.current && pick(e)}
        onPointerUp={() => { dragging.current = false; }}>
        <circle cx={c} cy={c} r={inner} fill="var(--raised)" stroke="var(--rule)" />
        {monthStart.map((start, m) => {
          const a = angle(start);
          const mid = angle(start + 15);
          return (
            <g key={m}>
              <line x1={c + Math.cos(a) * inner} y1={c + Math.sin(a) * inner} x2={c + Math.cos(a) * (outer + 6)} y2={c + Math.sin(a) * (outer + 6)}
                stroke="var(--rule)" />
              <text x={c + Math.cos(mid) * (outer + 16)} y={c + Math.sin(mid) * (outer + 16)} textAnchor="middle" dominantBaseline="central">{MONTHS[m]}</text>
            </g>
          );
        })}
        {days.map((d, i) => {
          const a = angle(i + 0.5);
          const len = r(d[reading]);
          return (
            <line key={d.date} x1={c + Math.cos(a) * inner} y1={c + Math.sin(a) * inner} x2={c + Math.cos(a) * len} y2={c + Math.sin(a) * len}
              stroke={d.poor ? "var(--poor)" : "var(--good)"} strokeWidth={stroke} strokeLinecap="round" />
          );
        })}
        {(() => {
          const a = angle(selected + 0.5);
          return (
            <g>
              <line x1={c + Math.cos(a) * (inner - 6)} y1={c + Math.sin(a) * (inner - 6)} x2={c + Math.cos(a) * (outer + 4)} y2={c + Math.sin(a) * (outer + 4)}
                stroke="var(--ink)" strokeWidth={Math.max(2, stroke)} strokeLinecap="round" />
              <circle cx={c + Math.cos(a) * (outer + 4)} cy={c + Math.sin(a) * (outer + 4)} r={4.5} fill="var(--ink)" />
            </g>
          );
        })()}
      </svg>
      <div className="clock-centre" aria-hidden="true">
        <span className="date">{longDate(day.date)}</span>
        <span className="verdict" style={{ color: day.poor ? "var(--poor)" : "var(--ink)" }}>{day.poor ? "Poor air" : "Good air"}</span>
        <span className="value">{label(reading).label} {format(reading, day[reading])}</span>
      </div>
    </div>
  );
}
