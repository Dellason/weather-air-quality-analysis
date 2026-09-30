"""Build the JSON the website reads, from the two daily CSV files.

Repeats notebooks/01_weather_air_quality_analysis.ipynb: the merge, the wind
bands, the 70/30 split and both classifiers. Exports every day with its split
and predictions, and the logistic regression's weights so the browser can run
it. Also tests one question the notebook left for later, whether weather
alone can predict a poor day. Writes web/public/data/{days,model}.json:

    python web/scripts/build_data.py
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "web" / "public" / "data"

WEATHER = ["temperature", "humidity", "wind_speed", "rainfall"]
POLLUTANTS = ["pm10", "pm25", "no2", "so2", "co"]


def wind_group(speed):
    if 0 <= speed < 10:
        return "Low"
    if 10 <= speed < 20:
        return "Moderate"
    if speed >= 20:
        return "High"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    readings = pd.read_csv(ROOT / "data" / "readings.csv", parse_dates=["date"])
    weather = pd.read_csv(ROOT / "data" / "weather.csv", parse_dates=["date"])
    df = weather.merge(readings, how="inner", on="date").set_index("date")
    df["wind_speed_cat"] = df["wind_speed"].apply(wind_group)

    target = pd.get_dummies(df["poor_air_quality"], prefix="", prefix_sep="", drop_first=True, dtype=int)
    features = pd.get_dummies(df.drop("poor_air_quality", axis=1), prefix="", prefix_sep="", drop_first=True, dtype=int)
    X_train, X_test, y_train, y_test = train_test_split(features, target, test_size=0.3, random_state=42)
    knn = KNeighborsClassifier(n_neighbors=3).fit(X_train, y_train.values.ravel())
    logistic = LogisticRegression(C=1e42, solver="liblinear").fit(X_train, y_train.values.ravel())
    knn_pred = knn.predict(X_test)
    lr_pred = logistic.predict(X_test)
    lr_prob = logistic.predict_proba(X_test)[:, 1]

    test_rows = {d: i for i, d in enumerate(X_test.index)}
    days = []
    for date, r in df.iterrows():
        day = {"date": date.strftime("%Y-%m-%d"), **{k: float(r[k]) for k in WEATHER + POLLUTANTS},
               "wind": r["wind_speed_cat"], "poor": int(r["poor_air_quality"]),
               "split": "test" if date in test_rows else "train"}
        if date in test_rows:
            i = test_rows[date]
            day |= {"knn": int(knn_pred[i]), "logistic": int(lr_pred[i]), "probability": round(float(lr_prob[i]), 4)}
        days.append(day)
    (OUT / "days.json").write_text(json.dumps(days, separators=(",", ":")))

    def cv(columns):
        pipe = make_pipeline(StandardScaler(), LogisticRegression())
        return round(float(cross_val_score(pipe, df[columns], df["poor_air_quality"], cv=5).mean()), 4)

    model = {
        "features": features.columns.tolist(),
        "logistic": {"intercept": float(logistic.intercept_[0]), "weights": [float(w) for w in logistic.coef_[0]]},
        "k": 3,
        "evaluation": {
            "testDays": len(X_test),
            "knn": {"accuracy": round(accuracy_score(y_test, knn_pred), 4), "matrix": confusion_matrix(y_test, knn_pred).tolist()},
            "logistic": {"accuracy": round(accuracy_score(y_test, lr_pred), 4), "matrix": confusion_matrix(y_test, lr_pred).tolist()},
        },
        # Not in the notebook: its "further work" asked how far weather alone gets.
        "beyond": {
            "method": "Scaled logistic regression, 5-fold cross-validation on all 365 days",
            "weatherOnly": cv(WEATHER),
            "pollutantsOnly": cv(POLLUTANTS),
            "everything": cv(WEATHER + POLLUTANTS),
            "alwaysGood": round(float(1 - df["poor_air_quality"].mean()), 4),
        },
    }
    (OUT / "model.json").write_text(json.dumps(model, indent=1))

    # The browser recomputes these; printing them catches drift from the notebook.
    ev = model["evaluation"]
    print(f"knn {ev['knn']}  logistic {ev['logistic']}")
    print(f"beyond {model['beyond']}")
    z = X_test.to_numpy() @ np.array(model["logistic"]["weights"]) + model["logistic"]["intercept"]
    print("browser formula matches predict_proba:", bool(np.allclose(1 / (1 + np.exp(-z)), lr_prob)))


if __name__ == "__main__":
    main()
