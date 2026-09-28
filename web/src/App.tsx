import { useEffect, useState } from "react";
import YearClock from "./YearClock";
import Smoothing from "./Smoothing";
import WeatherLens from "./WeatherLens";
import BuildADay from "./BuildADay";
import Models from "./Models";
import ThemeToggle from "./ThemeToggle";
import { READINGS, loadData, longDate, type Day, type Model, type Reading } from "./data";

const PORTFOLIO = "https://jjmensah.github.io/enam_portfolio/";
const CASE_STUDY = `${PORTFOLIO}projects/weather-air-quality/`;
const CLOCK_READINGS: Reading[] = ["pm25", "pm10", "no2", "so2", "co"];

function downloadCsv(days: Day[]) {
  const keys = ["date", ...READINGS.map(r => r.key), "wind", "poor"] as const;
  const rows = days.map(d => keys.map(k => d[k as keyof Day]).join(","));
  const blob = new Blob([[["date", ...READINGS.map(r => r.key), "wind_speed_cat", "poor_air_quality"].join(","), ...rows].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "weather_air_quality_2025.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

function DayReport({ day }: { day: Day }) {
  const verdict = day.split === "test" && day.logistic !== undefined
    ? `A test day: logistic regression called it ${day.logistic ? "poor" : "good"}, k-NN ${day.knn ? "poor" : "good"}.`
    : "A training day: both models learned from it.";
  return (
    <div className="panel report">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ fontSize: "var(--step-1)" }}>{longDate(day.date)}</h3>
        <span className={`badge ${day.poor ? "poor" : "good"}`}>{day.poor ? "Poor air" : "Good air"}</span>
      </div>
      <div className="readings">
        {READINGS.map(r => <div key={r.key}><span>{r.label}</span><b>{day[r.key].toFixed(r.key === "co" ? 2 : 1)}<small> {r.unit}</small></b></div>)}
      </div>
      <p className="small muted">{day.wind} wind. {verdict}</p>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<{ days: Day[]; model: Model } | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState(0);
  const [reading, setReading] = useState<Reading>("pm25");
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    loadData().then(d => {
      setData(d);
      // Open on the worst PM2.5 day of the year.
      setSelected(d.days.reduce((best, day, i, all) => (day.pm25 > all[best].pm25 ? i : best), 0));
    }).catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (!playing || !data) return;
    const last = data.days.length - 1;
    const id = window.setInterval(() => setSelected(i => Math.min(i + 1, last)), 60);
    return () => window.clearInterval(id);
  }, [playing, data]);

  useEffect(() => {
    if (playing && data && selected >= data.days.length - 1) setPlaying(false);
  }, [playing, data, selected]);

  if (failed) return <div className="loading">The readings could not be loaded. Refresh the page to try again.</div>;
  if (!data) return <div className="loading">Loading 365 days of readings…</div>;
  const { days, model } = data;
  const day = days[selected];
  const poorDays = days.filter(d => d.poor).length;
  const openDay = (date: string) => {
    setSelected(days.findIndex(d => d.date === date));
    document.getElementById("main")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <a className="skip" href="#main">Skip to the year clock</a>
      <div className="bar">
        <header className="wrap topbar">
          <a className="brand" href="#main">Air, day by day</a>
          <div className="topbar-end">
            <nav aria-label="Sections">
              <a href="#trend">Trend</a>
              <a href="#weather">Weather</a>
              <a href="#build">Build a day</a>
              <a href="#models">Models</a>
            </nav>
            <ThemeToggle />
          </div>
        </header>
      </div>

      <main id="main">
        <section className="wrap hero grid-hero" aria-labelledby="title">
          <div className="hero-intro" style={{ display: "grid", gap: 20 }}>
            <h1 id="title">365 days of air.</h1>
            <p className="lede">
              A synthetic year of daily weather and pollution readings for Dublin. {poorDays} of 365 days had poor air quality. Drag around the ring, or play the year.
            </p>
            <div className="row">
              <button type="button" className="button" onClick={() => {
                if (selected >= days.length - 1) setSelected(0);
                setPlaying(p => !p);
              }}>{playing ? "Pause" : selected >= days.length - 1 ? "Replay the year" : "Play the year"}</button>
              <div className="segmented" role="group" aria-label="Bars show">
                {CLOCK_READINGS.map(k => (
                  <button key={k} type="button" aria-pressed={reading === k} onClick={() => setReading(k)}>{READINGS.find(r => r.key === k)!.label}</button>
                ))}
              </div>
            </div>
            <div className="legend">
              <span><i className="swatch" style={{ background: "var(--good)" }} />good air</span>
              <span><i className="swatch" style={{ background: "var(--poor)" }} />poor air</span>
              <span>Bar length: {READINGS.find(r => r.key === reading)!.label}</span>
            </div>
          </div>
          <div className="hero-clock">
            <YearClock days={days} selected={selected} onSelect={i => { setPlaying(false); setSelected(i); }} reading={reading} />
          </div>
          <div className="hero-report"><DayReport day={day} /></div>
        </section>

        <section id="trend" className="section" aria-labelledby="trend-title">
          <div className="wrap">
            <div className="section-head">
              <span className="kicker">The trend</span>
              <h2 id="trend-title">Smooth out the noise</h2>
              <p>Daily particle readings jump around. A rolling mean shows the shape underneath. Change the window, and click any day to open it on the clock.</p>
            </div>
            <Smoothing days={days} selected={selected} onSelect={i => { setPlaying(false); setSelected(i); }} />
          </div>
        </section>

        <section id="weather" className="section" aria-labelledby="weather-title">
          <div className="wrap">
            <div className="section-head">
              <span className="kicker">The weather</span>
              <h2 id="weather-title">What does the weather do to the air?</h2>
              <p>The share of poor days in each band of weather. Cold, damp days are the ones to watch; wind and rain say surprisingly little.</p>
            </div>
            <WeatherLens days={days} model={model} />
          </div>
        </section>

        <section id="build" className="section" aria-labelledby="build-title">
          <div className="wrap">
            <div className="section-head">
              <span className="kicker">Build a day</span>
              <h2 id="build-title">Set the conditions. Ask both models.</h2>
              <p>
                The notebook's two classifiers run in this page. Logistic regression weighs every reading; k-nearest neighbours finds the three most similar real days and lets
                them vote.
              </p>
            </div>
            <BuildADay days={days} model={model} selected={day} />
          </div>
        </section>

        <section id="models" className="section" aria-labelledby="models-title">
          <div className="wrap">
            <div className="section-head">
              <span className="kicker">The test</span>
              <h2 id="models-title">{model.evaluation.testDays} days the models never saw</h2>
              <p>
                30% of the year was held back to test on. Logistic regression was right on {Math.round(model.evaluation.logistic.accuracy * model.evaluation.testDays)} of them,
                k-NN on {Math.round(model.evaluation.knn.accuracy * model.evaluation.testDays)}.
              </p>
            </div>
            <Models days={days} model={model} onSelect={openDay} />
          </div>
        </section>

        <section id="data" className="section" aria-labelledby="data-title">
          <div className="wrap grid-2">
            <div className="section-head" style={{ marginBottom: 0 }}>
              <span className="kicker">The data</span>
              <h2 id="data-title">Two files, one row per day</h2>
              <p>
                Synthetic daily weather and air-quality readings for Dublin from UCD's COMP47670 module, joined on date. All 365 days matched with no missing values; the wind bands were added in the analysis.
              </p>
              <div className="row" style={{ marginTop: 8 }}>
                <button type="button" className="button" onClick={() => downloadCsv(days)}>Download the merged CSV</button>
                <a className="button ghost" href={CASE_STUDY}>Read the case study</a>
              </div>
            </div>
            <div className="panel">
              <h3>Caveats</h3>
              <ul className="small muted" style={{ paddingLeft: 18, margin: "8px 0 0", display: "grid", gap: 8 }}>
                <li>The data is synthetic: the module generated it to resemble daily readings from Dublin monitoring stations. Patterns here describe that dataset, not measured Dublin air.</li>
                <li>The brief doesn't say how “poor air quality” was decided for each day.</li>
                <li>One year of daily data: 365 rows, 110 held out for testing. Scores on a split this small move a few points with a different split.</li>
                <li>The models were fitted on unscaled readings, as in the notebook. That is kept here so the page matches it.</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="wrap footer">
        <p>
          Analysis by <a href={PORTFOLIO}>Jessica Mawuenam Dellason</a>, for UCD's COMP47670 module. <a href={CASE_STUDY}>The full write-up</a> covers the notebook and results.
        </p>
      </footer>
    </>
  );
}
