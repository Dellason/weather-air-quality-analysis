import { scaleBand, scaleLinear } from "d3-scale";
import { useWidth } from "./YearClock";
import { pct, type Day, type Model } from "./data";

type Band = { name: string; test: (d: Day) => boolean };

const LENSES: { title: string; note: string; bands: Band[] }[] = [
  {
    title: "Temperature", note: "Below 5 °C, more than half of days are poor. Above 10 °C, about one in ten.",
    bands: [
      { name: "below 0 °C", test: d => d.temperature < 0 },
      { name: "0–5", test: d => d.temperature >= 0 && d.temperature < 5 },
      { name: "5–10", test: d => d.temperature >= 5 && d.temperature < 10 },
      { name: "10–15", test: d => d.temperature >= 10 && d.temperature < 15 },
      { name: "15 °C+", test: d => d.temperature >= 15 },
    ],
  },
  {
    title: "Humidity", note: "Just as sharp: about half of days above 75% humidity are poor.",
    bands: [
      { name: "under 65%", test: d => d.humidity < 65 },
      { name: "65–75", test: d => d.humidity >= 65 && d.humidity < 75 },
      { name: "75–85", test: d => d.humidity >= 75 && d.humidity < 85 },
      { name: "85%+", test: d => d.humidity >= 85 },
    ],
  },
  {
    title: "Wind, in the notebook's bands", note: "Only 29 days were calm. Moderate and windy days sit right on the year average.",
    bands: [
      { name: "Low", test: d => d.wind === "Low" },
      { name: "Moderate", test: d => d.wind === "Moderate" },
      { name: "High", test: d => d.wind === "High" },
    ],
  },
  {
    title: "Rainfall", note: "Rain doesn't clear the air here; the wettest days are slightly more often poor.",
    bands: [
      { name: "dry", test: d => d.rainfall === 0 },
      { name: "up to 2 mm", test: d => d.rainfall > 0 && d.rainfall <= 2 },
      { name: "2–5", test: d => d.rainfall > 2 && d.rainfall <= 5 },
      { name: "5 mm+", test: d => d.rainfall > 5 },
    ],
  },
];

function Lens({ days, title, note, bands, overall }: { days: Day[]; title: string; note: string; bands: Band[]; overall: number }) {
  const [frame, width] = useWidth(360);
  const rows = bands.map(b => {
    const group = days.filter(b.test);
    return { name: b.name, n: group.length, rate: group.length ? group.filter(d => d.poor).length / group.length : 0 };
  });
  const height = 170, bottom = 34, top = 18;
  const x = scaleBand().domain(rows.map(r => r.name)).range([0, width]).padding(0.28);
  const y = scaleLinear().domain([0, 0.7]).range([height - bottom, top]);
  return (
    <div className="panel">
      <p className="chart-title">{title}</p>
      <p className="chart-sub">{note} The dashed line is the year average, {pct(overall)}.</p>
      <div className="chart-frame" ref={frame}>
        <svg className="chart" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img"
          aria-label={`${title}: share of poor days per band. ${rows.map(r => `${r.name} ${pct(r.rate)} of ${r.n} days`).join("; ")}`}>
          <line x1={0} x2={width} y1={y(overall)} y2={y(overall)} stroke="var(--ink)" strokeDasharray="4 4" strokeOpacity={0.6} />
          {rows.map(r => (
            <g key={r.name}>
              <rect x={x(r.name)} y={y(r.rate)} width={x.bandwidth()} height={y(0) - y(r.rate)} rx={4} fill="var(--poor)" opacity={0.85} />
              <text x={x(r.name)! + x.bandwidth() / 2} y={y(r.rate) - 5} textAnchor="middle" className="strong">{pct(r.rate)}</text>
              <text x={x(r.name)! + x.bandwidth() / 2} y={height - bottom + 14} textAnchor="middle">{r.name}</text>
              <text x={x(r.name)! + x.bandwidth() / 2} y={height - bottom + 27} textAnchor="middle">{r.n} days</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default function WeatherLens({ days, model }: { days: Day[]; model: Model }) {
  const overall = days.filter(d => d.poor).length / days.length;
  const b = model.beyond;
  const bars = [
    { name: "Always say “good”", value: b.alwaysGood, muted: true },
    { name: "Weather only", value: b.weatherOnly, muted: false },
    { name: "Pollutants only", value: b.pollutantsOnly, muted: false },
    { name: "Weather and pollutants", value: b.everything, muted: false },
  ];
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div className="grid-2">
        {LENSES.map(l => <Lens key={l.title} days={days} {...l} overall={overall} />)}
      </div>
      <div className="grid-2">
        <div className="callout" style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <span className="kicker">Beyond the notebook</span>
          <h3 style={{ fontSize: "var(--step-1)" }}>Could weather alone forecast a poor day?</h3>
          <p className="small">
            The notebook's further-work list asked what weather can do without the pollution readings. Not much, in this data: a model on the four weather readings
            is right {pct(b.weatherOnly, 1)} of the time, below the {pct(b.alwaysGood, 1)} you get by calling every day good. Cold and damp are real signals, but nearly half of cold days and half of damp days were still fine; they point to winter rather than to a particular bad day. A poor day is decided by the particles in the air.
          </p>
          <p className="small muted">{b.method}.</p>
        </div>
        <div className="panel" style={{ display: "grid", gap: 10 }}>
          {bars.map(bar => (
            <div key={bar.name} style={{ display: "grid", gap: 4 }}>
              <div className="row small" style={{ justifyContent: "space-between" }}><span>{bar.name}</span><b>{pct(bar.value, 1)}</b></div>
              <div style={{ height: 10, borderRadius: 5, background: "var(--rule)" }}>
                <div style={{ width: pct(bar.value), height: "100%", borderRadius: 5, background: bar.muted ? "var(--soft)" : "var(--accent)" }} />
              </div>
            </div>
          ))}
          <p className="small muted">Accuracy predicting poor air quality, averaged over five folds.</p>
        </div>
      </div>
    </div>
  );
}
