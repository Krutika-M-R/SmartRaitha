"""Train and serve statewide Karnataka Random Forest price forecasts."""

import math
import os
import re
from datetime import date, timedelta
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

ML_DIR = Path(__file__).resolve().parent
TRAINING_DATA_PATH = Path(
    os.environ.get(
        "KARNATAKA_PRICE_HISTORY_CSV",
        ML_DIR.parent
        / "backend"
        / "data"
        / "agmarknet_karnataka_10yr_state_average_training_prices.csv",
    )
)
MODEL_PATH = ML_DIR / "models" / "karnataka_price_forest.pkl"
FEATURE_COLUMNS = [
    "crop_encoded",
    "day_of_year_sin",
    "day_of_year_cos",
    "days_since_last_report",
    "mean_7_ratio",
    "std_7_ratio",
    "previous_change_ratio",
]
MODEL_NAME = "Karnataka 10-year Random Forest (mandi-adjusted)"


class ForecastError(Exception):
    """Raised when there is insufficient data to create a forecast."""


def _normalize_crop_name(name):
    return re.sub(r"[^a-z0-9]", "", str(name).casefold())


def _load_history(csv_path=TRAINING_DATA_PATH):
    required = {
        "state",
        "crop_name",
        "price_date",
        "modal_price_per_kg",
        "geography_level",
    }
    history = pd.read_csv(csv_path, usecols=lambda column: column in required)
    missing = required.difference(history.columns)
    if missing:
        raise ForecastError(
            f"Training CSV is missing required columns: {', '.join(sorted(missing))}."
        )

    history = history[
        (history["state"].str.casefold() == "karnataka")
        & (history["geography_level"].str.casefold() == "state")
    ].copy()
    history["crop_name"] = history["crop_name"].astype(str).str.strip()
    history["price_date"] = pd.to_datetime(history["price_date"], errors="coerce")
    history["modal_price_per_kg"] = pd.to_numeric(
        history["modal_price_per_kg"], errors="coerce"
    )
    history = history.dropna(
        subset=["crop_name", "price_date", "modal_price_per_kg"]
    )
    history = history[
        (history["crop_name"] != "")
        & (history["modal_price_per_kg"] > 0)
    ]
    if history.empty:
        raise ForecastError("The Karnataka state-average training CSV has no usable prices.")

    return (
        history.groupby(["crop_name", "price_date"], as_index=False)[
            "modal_price_per_kg"
        ]
        .mean()
        .sort_values(["crop_name", "price_date"])
        .reset_index(drop=True)
    )


def _features_for_history(history, crop_encoder):
    history = history.copy()
    history["crop_encoded"] = crop_encoder.transform(history["crop_name"])
    groups = history.groupby("crop_name", sort=False)
    previous_price = groups["modal_price_per_kg"].shift(1)
    previous_previous_price = groups["modal_price_per_kg"].shift(2)
    previous_window_mean = groups["modal_price_per_kg"].transform(
        lambda prices: prices.shift(1).rolling(window=7, min_periods=1).mean()
    )
    previous_window_std = groups["modal_price_per_kg"].transform(
        lambda prices: prices.shift(1).rolling(window=7, min_periods=2).std()
    ).fillna(0)
    previous_date = groups["price_date"].shift(1)
    dates = history["price_date"]
    day_of_year = dates.dt.dayofyear

    features = pd.DataFrame(
        {
            "crop_encoded": history["crop_encoded"],
            "day_of_year_sin": np.sin(2 * np.pi * day_of_year / 365.25),
            "day_of_year_cos": np.cos(2 * np.pi * day_of_year / 365.25),
            "days_since_last_report": (dates - previous_date).dt.days,
            "mean_7_ratio": previous_window_mean / previous_price,
            "std_7_ratio": previous_window_std / previous_price,
            "previous_change_ratio": (
                previous_price / previous_previous_price
            ).replace([np.inf, -np.inf], np.nan).fillna(1.0),
            "previous_price": previous_price,
            "target_price": history["modal_price_per_kg"],
            "price_date": dates,
        }
    )
    features = features.replace([np.inf, -np.inf], np.nan).dropna(
        subset=FEATURE_COLUMNS + ["previous_price", "target_price"]
    )
    features = features[features["previous_price"] > 0]
    features["log_price_change"] = np.log(
        features["target_price"] / features["previous_price"]
    )
    return features.reset_index(drop=True)


def train_model(csv_path=TRAINING_DATA_PATH, model_path=MODEL_PATH):
    """Train on the ten-year Karnataka state-average series and save the forest."""
    history = _load_history(csv_path)
    from sklearn.preprocessing import LabelEncoder

    crop_encoder = LabelEncoder()
    crop_encoder.fit(history["crop_name"])
    training = _features_for_history(history, crop_encoder).sort_values("price_date")
    if len(training) < 100:
        raise ForecastError(
            f"Only {len(training)} usable training observations were found; at least 100 are required."
        )

    split_index = max(1, int(len(training) * 0.8))
    if split_index >= len(training):
        raise ForecastError("Not enough observations for a chronological validation split.")

    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=16,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    x_train = training.iloc[:split_index][FEATURE_COLUMNS]
    y_train = training.iloc[:split_index]["log_price_change"]
    x_test = training.iloc[split_index:][FEATURE_COLUMNS]
    y_test = training.iloc[split_index:]["log_price_change"]
    model.fit(x_train, y_train)

    predicted_test_prices = training.iloc[split_index:]["previous_price"].to_numpy() * np.exp(
        model.predict(x_test)
    )
    actual_test_prices = training.iloc[split_index:]["target_price"].to_numpy()
    print(
        "Chronological validation: "
        f"MAE={mean_absolute_error(actual_test_prices, predicted_test_prices):.2f} "
        f"RMSE={math.sqrt(mean_squared_error(actual_test_prices, predicted_test_prices)):.2f}"
    )

    model.fit(training[FEATURE_COLUMNS], training["log_price_change"])
    model_path = Path(model_path)
    model_path.parent.mkdir(parents=True, exist_ok=True)
    bundle = {
        "model": model,
        "model_name": "random_forest",
        "feature_columns": FEATURE_COLUMNS,
        "crop_encoder": crop_encoder,
        "trained_until": history["price_date"].max().date().isoformat(),
        "training_rows": len(training),
    }
    joblib.dump(bundle, model_path)
    print(
        f"Trained Random Forest on {len(training)} observations for "
        f"{len(crop_encoder.classes_)} crops through {bundle['trained_until']}."
    )
    print(f"Saved model to {model_path}")
    return bundle


def load_model(model_path=MODEL_PATH):
    try:
        return joblib.load(model_path)
    except FileNotFoundError as error:
        raise ForecastError(
            "The Karnataka Random Forest model is not trained. Run "
            "`python train_karnataka.py` from the ml folder first."
        ) from error


def _make_feature_row(crop_code, target_date, recent_prices):
    previous_price = recent_prices[-1]
    window = recent_prices[-7:]
    day_of_year = target_date.timetuple().tm_yday
    return pd.DataFrame(
        [
            {
                "crop_encoded": crop_code,
                "day_of_year_sin": math.sin(2 * math.pi * day_of_year / 365.25),
                "day_of_year_cos": math.cos(2 * math.pi * day_of_year / 365.25),
                "days_since_last_report": 1,
                "mean_7_ratio": float(np.mean(window)) / previous_price,
                "std_7_ratio": (
                    float(np.std(window, ddof=1)) / previous_price
                    if len(window) > 1
                    else 0.0
                ),
                "previous_change_ratio": (
                    previous_price / recent_prices[-2]
                    if len(recent_prices) > 1 and recent_prices[-2] > 0
                    else 1.0
                ),
            }
        ],
        columns=FEATURE_COLUMNS,
    )


def forecast_two_days(
    crop_name,
    target_date,
    mandi_prices,
    bundle=None,
    model_path=MODEL_PATH,
):
    """Forecast two statewide days, then scale estimates to each mandi's latest price."""
    bundle = bundle or load_model(model_path)
    try:
        first_date = date.fromisoformat(target_date)
    except (TypeError, ValueError) as error:
        raise ForecastError("targetDate must use YYYY-MM-DD format.") from error

    crop_lookup = {
        _normalize_crop_name(crop): index
        for index, crop in enumerate(bundle["crop_encoder"].classes_)
    }
    normalized_crop = _normalize_crop_name(crop_name)
    if normalized_crop not in crop_lookup:
        raise ForecastError(f"No ten-year Karnataka history was found for {crop_name}.")

    valid_mandis = []
    for item in mandi_prices:
        try:
            price = float(item["modalPrice"])
        except (KeyError, TypeError, ValueError):
            continue
        if item.get("mandiName") and math.isfinite(price) and price > 0:
            valid_mandis.append((item, price))
    if not valid_mandis:
        raise ForecastError("No valid latest mandi prices were supplied for adjustment.")

    current_market_average = float(np.mean([price for _, price in valid_mandis]))
    recent_prices = [current_market_average] * 7
    crop_code = crop_lookup[normalized_crop]
    predictions = []

    for day_offset in range(2):
        forecast_date = first_date + timedelta(days=day_offset)
        features = _make_feature_row(crop_code, forecast_date, recent_prices)
        log_change = float(bundle["model"].predict(features)[0])
        statewide_price = recent_prices[-1] * math.exp(log_change)
        if not math.isfinite(statewide_price) or statewide_price <= 0:
            raise ForecastError("The Random Forest returned an invalid price forecast.")
        recent_prices.append(statewide_price)

        for item, latest_price in valid_mandis:
            predictions.append(
                {
                    "mandiName": item["mandiName"],
                    "predictedDate": forecast_date.isoformat(),
                    "predictedPrice": round(
                        statewide_price * latest_price / current_market_average, 2
                    ),
                    "latestPriceDate": item.get("latestPriceDate"),
                    "sampleCount": int(item.get("sampleCount", 1)),
                    "modelVersion": MODEL_NAME,
                    "dataFreshness": item.get("dataFreshness", "cached"),
                }
            )
    return predictions
