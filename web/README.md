# Air, day by day

An interactive site for the weather and air-quality analysis. A year of daily readings wraps around a ring that visitors can scrub or play, and the notebook's two classifiers run in the browser.

**Live:** https://jjmensah.github.io/enam_portfolio/lab/air/, served from the portfolio's `public/lab/air/`. Run `npm run lab:air` in `enam_portfolio` to publish a new build.

The data is synthetic: UCD's COMP47670 module generated it to resemble daily readings from Dublin monitoring stations. The site says so on the page.

## Sections

| Section | What it does |
| --- | --- |
| Year clock | 365 bars around a ring, one per day, sized by the chosen pollutant and coloured good or poor. Drag, click, use the arrow keys or play the year; a report shows every reading for the chosen day. |
| Trend | PM10 and PM2.5 with a rolling mean whose window is a slider (the notebook used 14 days). |
| Weather | The share of poor days across bands of temperature, humidity, the notebook's wind bands and rainfall, and a check of whether weather alone can predict a poor day. |
| Build a day | Set every reading; logistic regression gives its verdict and the readings that moved it, and k-NN shows the three most similar real days and what made them similar. |
| Test | Both confusion matrices on the 110 held-out days, with every missed poor day one click from the clock. |

## Run it

```bash
npm ci
npm run dev           # http://localhost:5173
npm run build         # static site in dist/
npm run test:models   # both browser models must match scikit-learn
```

## Rebuild the data

`public/data/` is generated from `../data/`. The script repeats the notebook's merge, wind bands, split and classifiers and reproduces its scores:

```bash
pip install pandas scikit-learn
npm run data
npm run test:models
```

`test:models` reruns k-NN and logistic regression from `src/data.ts` on all 110 test days. The last run agreed with scikit-learn on every prediction, with probabilities within 0.00005.

The weather-only comparison is not in the notebook. It answers the notebook's own further-work question, using scaled logistic regression with five-fold cross-validation, and the page labels it as going beyond the notebook.

## Stack

React, TypeScript and Vite. Charts are hand-drawn SVG using `d3-scale` and `d3-shape`. Bricolage Grotesque and Public Sans are bundled locally.
