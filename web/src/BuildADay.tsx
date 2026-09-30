import { useMemo, useState } from "react";
import {
  READINGS, format, label, logisticProbability, longDate, nearest, pct, windBand,
  type Conditions, type Day, type Model, type Reading,
} from "./data";

const pick = (d: Day): Conditions => Object.fromEntries(READINGS.map(r => [r.key, d[r.key]])) as Conditions;

function medianDay(days: Day[]): Conditions {
  return Object.fromEntries(READINGS.map(r => {
    const v = days.map(d => d[r.key]).sort((a, b) => a - b);
    return [r.key, v[Math.floor(v.length / 2)]];
  })) as Conditions;
}

const featureName = (f: string) => (f === "Low" || f === "Moderate" ? `${f} wind band` : label(f as Reading).label);

export default function BuildADay({ days, model, selected }: { days: Day[]; model: Model; selected: Day }) {
  const train = useMemo(() => days.filter(d => d.split === "train"), [days]);
  const presets = useMemo(() => ({
    "A typical January day": medianDay(days.filter(d => d.date.slice(5, 7) === "01")),
    "A typical July day": medianDay(days.filter(d => d.date.slice(5, 7) === "07")),
  }), [days]);
  const average = useMemo(() => medianDay(days), [days]);
  const [c, setC] = useState<Conditions>(presets["A typical January day"]);

  const p = logisticProbability(model, c);
  const neighbours = nearest(model, train, c);
  const votes = neighbours.filter(n => n.day.poor).length;

  // Each reading's push on the log-odds, measured from a median day.
  const pushes = READINGS.map((r, i) => ({ key: r.key, v: model.logistic.weights[i] * (c[r.key] - average[r.key]) }))
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 4);

  const set = (key: Reading, v: number) => setC(prev => ({ ...prev, [key]: v }));

  const slider = (key: Reading) => {
    const r = label(key);
    return (
      <label key={key} className="slider">
        <span className="slider-head"><span>{r.label}</span><b>{format(key, c[key])}{key === "wind_speed" ? ` · ${windBand(c.wind_speed)}` : ""}</b></span>
        <input type="range" min={r.min} max={r.max} step={r.step} value={c[key]} onChange={e => set(key, Number(e.target.value))} />
      </label>
    );
  };

  return (
    <div className="grid-build">
      <div className="panel sliders">
        <div className="row">
          {Object.entries(presets).map(([name, value]) => <button key={name} type="button" className="button ghost" onClick={() => setC(value)}>{name}</button>)}
          <button type="button" className="button ghost" onClick={() => setC(pick(selected))}>Copy {longDate(selected.date)}</button>
        </div>
        <h3>Weather</h3>
        {READINGS.filter(r => r.weather).map(r => slider(r.key))}
        <h3>Pollution</h3>
        {READINGS.filter(r => !r.weather).map(r => slider(r.key))}
      </div>

      <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
        <div className="panel" style={{ display: "grid", gap: 12 }} aria-live="polite">
          <p className="small muted">Logistic regression, trained on {train.length} days</p>
          <p className="big-verdict" style={{ color: p >= 0.5 ? "var(--poor)" : "var(--ink)" }}>{p >= 0.5 ? "Poor air" : "Good air"}, {pct(p >= 0.5 ? p : 1 - p)} sure</p>
          <div className="prob-track" role="meter" aria-label="Chance of poor air" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)}>
            <i style={{ left: pct(p, 2) }} />
          </div>
          <div className="row small muted" style={{ justifyContent: "space-between" }}><span>good</span><span>poor</span></div>
          <p className="small"><b>Biggest pushes, compared with a median day:</b></p>
          <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
            {pushes.map(x => (
              <li key={x.key}>{label(x.key).label} {x.v >= 0 ? "towards poor" : "towards good"} <span className="muted">({x.v >= 0 ? "+" : "−"}{Math.abs(x.v).toFixed(2)} log-odds)</span></li>
            ))}
          </ul>
        </div>

        <div className="panel" style={{ display: "grid", gap: 12 }}>
          <p className="small muted">k-nearest neighbours, k = 3</p>
          <p className="big-verdict" style={{ fontSize: "var(--step-2)", color: votes >= 2 ? "var(--poor)" : "var(--ink)" }}>
            {votes} of 3 similar days were poor, so {votes >= 2 ? "poor air" : "good air"}
          </p>
          <div className="neighbours">
            {neighbours.map(n => {
              const top = [...n.shares].sort((a, b) => b.share - a.share);
              return (
                <div className="neighbour" key={n.day.date}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <b>{longDate(n.day.date)}</b>
                    <span className={`badge ${n.day.poor ? "poor" : "good"}`}>{n.day.poor ? "poor" : "good"}</span>
                  </div>
                  <div className="shares" aria-hidden="true">
                    <i style={{ width: pct(top[0].share), background: "var(--accent)" }} />
                    <i style={{ width: pct(top[1].share), background: "color-mix(in srgb, var(--accent) 45%, transparent)" }} />
                  </div>
                  <span className="small muted">
                    Distance {n.distance.toFixed(1)}, mostly from {featureName(top[0].feature)} ({pct(top[0].share)}) and {featureName(top[1].feature)} ({pct(top[1].share)}).
                  </span>
                </div>
              );
            })}
          </div>
          <p className="small muted">
            The notebook's k-NN compares raw numbers, so readings with wide ranges like humidity, PM10 and NO₂ decide which days count as similar. CO, which the
            logistic model leans on hardest per unit, barely moves the distance because its values stay below 2.3 mg/m³.
          </p>
        </div>
      </div>
    </div>
  );
}
