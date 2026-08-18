"""
Trains a price-prediction model on historical mandi price data.

WHAT:  Predicts modal_price for a given crop + mandi + date.
WHY:   Farmers want to know what tomorrow's / next week's price might be,
       not just today's price, so they can time when they sell.
HOW:   Simple, explainable features (day of year, days since dataset start,
       recent average price, crop, mandi) fed into Linear Regression and
       Random Forest. We keep both models, compare them on held-out data,
       and save whichever performs better.

Run:  python train.py
"""

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

from data_loader import load_price_history

MODEL_PATH = "models/price_model.pkl"
MIN_ROWS_REQUIRED = 30  # below this, predictions won't be meaningful


def build_features(df: pd.DataFrame):
    """Turn raw price rows into a feature matrix X and target y."""
    df = df.sort_values("date").copy()

    df["day_of_year"] = df["date"].dt.dayofyear
    start = df["date"].min()
    df["days_since_start"] = (df["date"] - start).dt.days

    # 7-day rolling average price per crop+mandi - captures recent trend
    # without leaking the current row's own price into the feature.
    df["rolling_avg_price"] = (
        df.groupby(["crop_id", "mandi_id"])["modal_price"]
        .transform(lambda s: s.shift(1).rolling(window=7, min_periods=1).mean())
    )
    df["rolling_avg_price"] = df["rolling_avg_price"].fillna(df["modal_price"].mean())

    crop_encoder = LabelEncoder()
    mandi_encoder = LabelEncoder()
    df["crop_encoded"] = crop_encoder.fit_transform(df["crop_id"])
    df["mandi_encoded"] = mandi_encoder.fit_transform(df["mandi_id"])

    feature_cols = ["day_of_year", "days_since_start", "rolling_avg_price", "crop_encoded", "mandi_encoded"]
    X = df[feature_cols]
    y = df["modal_price"]

    encoders = {"crop_encoder": crop_encoder, "mandi_encoder": mandi_encoder, "start_date": start}
    return X, y, encoders, feature_cols


def evaluate(model, X_test, y_test, name):
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    r2 = r2_score(y_test, preds)
    print(f"{name}: MAE={mae:.2f}  RMSE={rmse:.2f}  R2={r2:.3f}")
    return {"mae": mae, "rmse": rmse, "r2": r2}


def main():
    df = load_price_history()

    if len(df) < MIN_ROWS_REQUIRED:
        print(
            f"Only {len(df)} price records found (need at least {MIN_ROWS_REQUIRED}). "
            "Run the Agmarknet import a few more times (on different days) to build up "
            "enough history before training a useful model."
        )
        return

    X, y, encoders, feature_cols = build_features(df)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    linreg = LinearRegression()
    linreg.fit(X_train, y_train)
    linreg_metrics = evaluate(linreg, X_test, y_test, "Linear Regression")

    forest = RandomForestRegressor(n_estimators=200, max_depth=8, random_state=42)
    forest.fit(X_train, y_train)
    forest_metrics = evaluate(forest, X_test, y_test, "Random Forest")

    # Pick whichever model has the lower RMSE - don't just pick the
    # fancier-sounding one.
    if forest_metrics["rmse"] < linreg_metrics["rmse"]:
        best_model, best_name = forest, "random_forest"
    else:
        best_model, best_name = linreg, "linear_regression"

    print(f"\nSelected model: {best_name}")

    joblib.dump(
        {
            "model": best_model,
            "model_name": best_name,
            "feature_cols": feature_cols,
            "encoders": encoders,
        },
        MODEL_PATH,
    )
    print(f"Saved to {MODEL_PATH}")


if __name__ == "__main__":
    main()
