# Weather & Air Quality Analysis

An end-to-end Python data-analysis project exploring relationships between weather conditions and air quality.

## Project overview

This project combines daily weather observations with air-pollution measurements, prepares the data for analysis, engineers useful categories, and investigates patterns associated with poor air quality.

## Workflow

```text
Weather data + Air-quality data
              |
              v
        Merge by date
              |
              v
      Data quality checks
              |
              v
       Feature engineering
              |
              v
 Exploratory analysis & visualisation
              |
              v
      Air-quality insights
```

## What this project explores

- Daily temperature, humidity, wind speed and rainfall
- PM10 and PM2.5 concentrations
- NO2, SO2 and CO measurements
- Poor-air-quality observations
- Wind-speed categories
- Relationships between weather conditions and air quality
- Time-based patterns across the year

## Repository structure

```text
.
├── notebooks/
│   └── 01_weather_air_quality_analysis.ipynb
├── data/
│   ├── readings.csv
│   └── weather.csv
├── reference/
│   └── original_exam_brief.pdf
├── requirements.txt
└── .gitignore
```

## Data

The project uses two daily datasets:

- **Weather data** — temperature, humidity, wind speed and rainfall.
- **Air-quality data** — PM10, PM2.5, NO2, SO2, CO and a poor-air-quality indicator.

The datasets are joined on date to create a single analytical dataset.

## Feature engineering

The analysis derives a categorical wind-speed feature:

- Low
- Moderate
- High

This makes it possible to compare air-quality observations across different wind conditions.

## Tech stack

- Python
- Pandas
- NumPy
- Matplotlib
- Seaborn
- Jupyter

## Running the project

Install the dependencies:

```bash
pip install -r requirements.txt
```

Launch Jupyter:

```bash
jupyter notebook
```

Then open:

```text
notebooks/01_weather_air_quality_analysis.ipynb
```

## Portfolio direction

This is being developed as a standalone data-science portfolio project rather than an exam submission.

The eventual web version can turn the analysis into an interactive environmental dashboard, allowing visitors to explore weather conditions, pollution measurements, trends and air-quality patterns.

The original exam brief is retained as reference material.
