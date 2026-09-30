import { longDate, pct, type Day, type Model } from "./data";

const median = (list: Day[], key: "pm25") => {
  const v = list.map(d => d[key]).sort((a, b) => a - b);
  return v[Math.floor(v.length / 2)] ?? 0;
};

function Matrix({ matrix }: { matrix: number[][] }) {
  const total = matrix.flat().reduce((a, b) => a + b, 0);
  const tone = (n: number, right: boolean) => ({
    background: right ? `color-mix(in srgb, var(--accent) ${10 + (n / total) * 70}%, transparent)` : `color-mix(in srgb, var(--poor) ${10 + (n / total) * 150}%, transparent)`,
  });
  const [[tn, fp], [fn, tp]] = matrix;
  return (
    <div className="matrix" role="table" aria-label="Confusion matrix">
      <span />
      <span className="axis small" role="columnheader">Predicted good</span>
      <span className="axis small" role="columnheader">Predicted poor</span>
      <span className="axis small" role="rowheader">Actually good</span>
      <div className="cell" style={tone(tn, true)} role="cell"><b>{tn}</b>right</div>
      <div className="cell" style={tone(fp, false)} role="cell"><b>{fp}</b>false alarms</div>
      <span className="axis small" role="rowheader">Actually poor</span>
      <div className="cell" style={tone(fn, false)} role="cell"><b>{fn}</b>missed</div>
      <div className="cell" style={tone(tp, true)} role="cell"><b>{tp}</b>right</div>
    </div>
  );
}

export default function Models({ days, model, onSelect }: { days: Day[]; model: Model; onSelect: (date: string) => void }) {
  const test = days.filter(d => d.split === "test");
  const missed = (key: "knn" | "logistic") => test.filter(d => d.poor && d[key] === 0);
  const falseAlarms = (key: "knn" | "logistic") => test.filter(d => !d.poor && d[key] === 1);
  const knnMissed = missed("knn"), lrMissed = missed("logistic");
  const both = knnMissed.filter(d => lrMissed.some(x => x.date === d.date));
  const goodSplits = test.filter(d => !d.poor && d.knn !== d.logistic).length;
  const testPoor = test.filter(d => d.poor).length;
  const poor = days.filter(d => d.poor), good = days.filter(d => !d.poor);
  const ev = model.evaluation;

  const chips = (list: Day[]) => (
    <div className="day-list">
      {list.map(d => <button key={d.date} type="button" className="day-chip" onClick={() => onSelect(d.date)}>{longDate(d.date)}</button>)}
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div className="grid-2">
        {([["k-nearest neighbours, k = 3", ev.knn, knnMissed], ["Logistic regression", ev.logistic, lrMissed]] as const).map(([name, e, list]) => (
          <div key={name} className="panel" style={{ display: "grid", gap: 14, alignContent: "start" }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3 style={{ fontSize: "var(--step-1)" }}>{name}</h3>
              <b style={{ fontFamily: "var(--display)", fontSize: "var(--step-2)" }}>{pct(e.accuracy, 1)}</b>
            </div>
            <Matrix matrix={e.matrix} />
            <p className="small muted">The {list.length} poor days it missed. Open one on the year clock:</p>
            {chips(list)}
          </div>
        ))}
      </div>
      <div className="callout small">
        <p>
          Both models raise exactly {falseAlarms("knn").length} false alarms, which is why the notebook saw them as equal on good days. They are different days:
          the two models disagree on {goodSplits} good days in all. The accuracy gap is in the poor days, where logistic regression catches {testPoor - lrMissed.length} of {testPoor}
          {" "}and k-NN {testPoor - knnMissed.length}.
        </p>
        <p style={{ marginTop: 8 }}>
          {both.length} poor days fooled both. Their median PM2.5 was {median(both, "pm25").toFixed(1)} µg/m³, between a typical good day ({median(good, "pm25").toFixed(1)})
          and a typical poor day ({median(poor, "pm25").toFixed(1)}): they sit right on the boundary.
        </p>
      </div>
    </div>
  );
}
