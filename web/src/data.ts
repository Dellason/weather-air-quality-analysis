export type Wind = "Low" | "Moderate" | "High";

export type Day = {
  date: string;
  temperature: number;
  humidity: number;
  wind_speed: number;
  rainfall: number;
  pm10: number;
  pm25: number;
  no2: number;
  so2: number;
  co: number;
  wind: Wind;
  poor: 0 | 1;
  split: "train" | "test";
  knn?: 0 | 1;
  logistic?: 0 | 1;
  probability?: number;
};

export type Model = {
  features: string[];
  logistic: { intercept: number; weights: number[] };
  k: number;
  evaluation: {
    testDays: number;
    knn: { accuracy: number; matrix: number[][] };
    logistic: { accuracy: number; matrix: number[][] };
  };
  beyond: { method: string; weatherOnly: number; pollutantsOnly: number; everything: number; alwaysGood: number };
};

export type Reading = "temperature" | "humidity" | "wind_speed" | "rainfall" | "pm10" | "pm25" | "no2" | "so2" | "co";

// Units as given in the module brief.
export const READINGS: { key: Reading; label: string; unit: string; min: number; max: number; step: number; weather: boolean }[] = [
  { key: "temperature", label: "Temperature", unit: "°C", min: -5, max: 22, step: 0.5, weather: true },
  { key: "humidity", label: "Humidity", unit: "%", min: 50, max: 100, step: 1, weather: true },
  { key: "wind_speed", label: "Wind speed", unit: "km/h", min: 0, max: 30, step: 0.5, weather: true },
  { key: "rainfall", label: "Rainfall", unit: "mm", min: 0, max: 26, step: 0.5, weather: true },
  { key: "pm10", label: "PM10", unit: "µg/m³", min: 0, max: 80, step: 1, weather: false },
  { key: "pm25", label: "PM2.5", unit: "µg/m³", min: 0, max: 50, step: 0.5, weather: false },
  { key: "no2", label: "NO₂", unit: "µg/m³", min: 0, max: 62, step: 1, weather: false },
  { key: "so2", label: "SO₂", unit: "µg/m³", min: 0, max: 23, step: 0.5, weather: false },
  { key: "co", label: "CO", unit: "mg/m³", min: 0, max: 2.3, step: 0.05, weather: false },
];

export const label = (key: Reading) => READINGS.find(r => r.key === key)!;

export const format = (key: Reading, value: number) => {
  const r = label(key);
  const digits = key === "co" ? 2 : 1;
  return `${value.toFixed(digits)} ${r.unit}`;
};

export const windBand = (speed: number): Wind => (speed < 10 ? "Low" : speed < 20 ? "Moderate" : "High");

export async function loadData() {
  const base = import.meta.env.BASE_URL;
  const [days, model] = await Promise.all([
    fetch(`${base}data/days.json`).then(r => r.json() as Promise<Day[]>),
    fetch(`${base}data/model.json`).then(r => r.json() as Promise<Model>),
  ]);
  return { days, model };
}

export type Conditions = Record<Reading, number>;

// The notebook's features: nine readings plus the Low and Moderate wind dummies.
function vector(model: Model, c: Conditions) {
  const band = windBand(c.wind_speed);
  return model.features.map(f => (f === "Low" ? Number(band === "Low") : f === "Moderate" ? Number(band === "Moderate") : c[f as Reading]));
}

export function logisticProbability(model: Model, c: Conditions) {
  const x = vector(model, c);
  const z = model.logistic.intercept + x.reduce((s, v, i) => s + v * model.logistic.weights[i], 0);
  return 1 / (1 + Math.exp(-z));
}

export type Neighbour = { day: Day; distance: number; shares: { feature: string; share: number }[] };

// k-NN on unscaled features, as in the notebook, with each feature's share of
// the squared distance so the page can show which readings decided "similar".
export function nearest(model: Model, train: Day[], c: Conditions): Neighbour[] {
  const target = vector(model, c);
  return train
    .map(day => {
      const x = vector(model, day);
      const parts = x.map((v, i) => (v - target[i]) ** 2);
      const total = parts.reduce((a, b) => a + b, 0);
      return {
        day,
        distance: Math.sqrt(total),
        shares: model.features.map((f, i) => ({ feature: f, share: total ? parts[i] / total : 0 })),
      };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, model.k);
}

export const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "long" });

export const pct = (p: number, digits = 0) => `${(p * 100).toFixed(digits)}%`;
