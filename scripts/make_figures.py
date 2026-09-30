"""Render the README and portfolio figures for the air-quality analysis.

Repeats the merge, wind categories and classifiers from
notebooks/01_weather_air_quality_analysis.ipynb, then writes PNGs to
assets/figures/. Run from anywhere:

    python scripts/make_figures.py
"""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.colors import LinearSegmentedColormap
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "figures"

SURFACE = "#fcfcfb"
INK = "#0b0b0b"
MUTED = "#52514e"
GRID = "#e4e3de"
PM10 = "#2a78d6"
PM25 = "#eb6834"
GOOD = "#9d9c96"
POOR = "#2a78d6"

plt.rcParams.update({
    "figure.facecolor": SURFACE, "axes.facecolor": SURFACE,
    "savefig.facecolor": SURFACE, "font.family": "sans-serif",
    "font.sans-serif": ["Helvetica Neue", "Helvetica", "Arial", "DejaVu Sans"],
    "font.size": 11, "text.color": INK, "axes.labelcolor": MUTED,
    "xtick.color": MUTED, "ytick.color": MUTED, "axes.edgecolor": GRID,
    "axes.spines.top": False, "axes.spines.right": False,
    "axes.spines.left": False, "axes.grid": True, "axes.grid.axis": "y",
    "grid.color": GRID, "grid.linewidth": 0.8, "axes.axisbelow": True,
    "axes.titlesize": 15, "axes.titleweight": "medium", "axes.titlepad": 34,
    "axes.titlelocation": "left", "legend.frameon": False,
    "xtick.major.size": 0, "ytick.major.size": 0,
})


def wind_group(speed):
    if speed < 10:
        return "Low"
    if speed < 20:
        return "Moderate"
    return "High"


def load():
    readings = pd.read_csv(ROOT / "data" / "readings.csv", parse_dates=["date"])
    weather = pd.read_csv(ROOT / "data" / "weather.csv", parse_dates=["date"])
    df = weather.merge(readings, how="inner", on="date").set_index("date")
    df["wind_speed_cat"] = df["wind_speed"].apply(wind_group)
    return df


def save(fig, name):
    fig.tight_layout()
    fig.savefig(OUT / name, dpi=200)
    plt.close(fig)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    df = load()

    fig, ax = plt.subplots(figsize=(11, 4.8))
    for column, label, colour in (("pm10", "PM10", PM10), ("pm25", "PM2.5", PM25)):
        ax.plot(df.index, df[column], color=colour, linewidth=0.8, alpha=0.3)
        ax.plot(df.index, df[column].rolling(14).mean(), color=colour, linewidth=2.2,
                label=f"{label}, 14-day mean")
    ax.set_ylabel("µg/m³")
    ax.set_title("Particulate matter through 2025")
    ax.legend(loc="lower left", ncols=2, bbox_to_anchor=(0, 1.0),
              borderaxespad=0.2, handlelength=1.6)
    ax.xaxis.set_major_formatter(plt.matplotlib.dates.DateFormatter("%b"))
    ax.margins(x=0)
    save(fig, "particulates.png")

    by_month = df["poor_air_quality"].groupby(df.index.month).agg(["sum", "count"])
    by_month.index = pd.to_datetime(by_month.index, format="%m").strftime("%b")
    fig, ax = plt.subplots(figsize=(11, 4.2))
    ax.bar(by_month.index, by_month["sum"], color=POOR, width=0.6)
    for i, v in enumerate(by_month["sum"]):
        ax.text(i, v + 0.4, str(v), ha="center", color=INK)
    ax.set_title(f"Poor air-quality days per month  ·  {int(df['poor_air_quality'].sum())} of {len(df)} in total")
    save(fig, "poor-days-by-month.png")

    fig, axes = plt.subplots(1, 3, figsize=(11, 4.2))
    for ax, (column, label) in zip(axes, (("temperature", "Temperature (°C)"),
                                          ("humidity", "Humidity (%)"),
                                          ("wind_speed", "Wind speed (km/h)"))):
        means = df.groupby("poor_air_quality")[column].mean()
        ax.bar(["Good", "Poor"], means.values, color=[GOOD, POOR], width=0.55)
        for i, v in enumerate(means.values):
            ax.text(i, v * 1.02, f"{v:.1f}", ha="center", color=INK)
        ax.set_title(label, fontsize=12, pad=12)
        ax.set_ylim(0, means.max() * 1.18)
    fig.suptitle("Average weather on good and poor air-quality days", x=0.012,
                 ha="left", fontsize=15, fontweight="medium")
    save(fig, "weather-by-air-quality.png")

    target = pd.get_dummies(df["poor_air_quality"], prefix="", prefix_sep="",
                            drop_first=True, dtype=int)
    features = pd.get_dummies(df.drop("poor_air_quality", axis=1), prefix="",
                              prefix_sep="", drop_first=True, dtype=int)
    X_train, X_test, y_train, y_test = train_test_split(features, target,
                                                        test_size=0.3, random_state=42)
    models = {
        "k-nearest neighbours (k=3)": KNeighborsClassifier(n_neighbors=3),
        "Logistic regression": LogisticRegression(C=1e42, solver="liblinear"),
    }
    blues = LinearSegmentedColormap.from_list("blues", ["#eef4fc", "#2a78d6", "#0d3a73"])
    fig, axes = plt.subplots(1, 2, figsize=(10, 4.6))
    for ax, (name, model) in zip(axes, models.items()):
        predicted = model.fit(X_train, y_train.values.ravel()).predict(X_test)
        matrix = confusion_matrix(y_test, predicted)
        ax.imshow(matrix, cmap=blues, vmin=0, vmax=matrix.max())
        for (i, j), v in np.ndenumerate(matrix):
            ax.text(j, i, str(v), ha="center", va="center", fontsize=16,
                    color="white" if v > matrix.max() / 2 else INK)
        ax.set_xticks([0, 1], ["Good", "Poor"])
        ax.set_yticks([0, 1], ["Good", "Poor"])
        ax.set_xlabel("Predicted"); ax.set_ylabel("Actual")
        ax.grid(False)
        for spine in ax.spines.values():
            spine.set_visible(False)
        ax.set_title(f"{name}\naccuracy {accuracy_score(y_test, predicted):.3f}",
                     fontsize=12, pad=12, loc="center")
        print(name, accuracy_score(y_test, predicted), matrix.tolist())
    save(fig, "confusion-matrices.png")


if __name__ == "__main__":
    main()
