// Checks src/data.ts against scikit-learn: on every test day, the browser's
// k-NN vote and logistic-regression verdict must equal the notebook's.
//
//   npm run test:models
import { readFileSync } from "node:fs";
import { logisticProbability, nearest } from "../src/data.ts";

const load = name => JSON.parse(readFileSync(new URL(`../public/data/${name}`, import.meta.url)));
const days = load("days.json");
const model = load("model.json");
const train = days.filter(d => d.split === "train");
const test = days.filter(d => d.split === "test");

let knnWrong = 0, lrWrong = 0, worst = 0;
for (const day of test) {
  const votes = nearest(model, train, day).reduce((s, n) => s + n.day.poor, 0);
  if (Number(votes >= 2) !== day.knn) knnWrong++;
  const p = logisticProbability(model, day);
  worst = Math.max(worst, Math.abs(p - day.probability));
  if (Number(p >= 0.5) !== day.logistic) lrWrong++;
}
console.log(`${test.length} test days: k-NN disagreements ${knnWrong}, logistic disagreements ${lrWrong}, largest probability difference ${worst.toFixed(5)}`);
if (knnWrong || lrWrong || worst > 1e-3) process.exit(1);
