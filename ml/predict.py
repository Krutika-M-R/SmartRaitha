"""
WHAT:  Loads the trained model and predicts modal_price for a given
       crop_id, mandi_id, and target date.
WHY:   Kept separate from train.py so the Flask API can import just this,
       without needing scikit-learn's training machinery on every request.
HOW:   Rebuilds the same feature vector used during training, using the
       saved encoders so categories line up with what the model learned.
"""

import pandas as pd
import joblib

from data_loader import load_price_history

MODEL_PATH = "models/price_model.pkl"


class PredictionError(Exception):
    pass


def load_model():
    try:
        return joblib.load(MODEL_PATH)
    except FileNotFoundError:
        raise PredictionError("No trained model found. Run `python train.py` first.")


def predict_price(crop_id: int, mandi_id: int, target_date: str):
    bundle = load_model()
    model = bundle["model"]
    feature_cols = bundle["feature_cols"]
    encoders = bundle["encoders"]

    crop_encoder = encoders["crop_encoder"]
    mandi_encoder = encoders["mandi_encoder"]
    start_date = encoders["start_date"]

    if crop_id not in crop_encoder.classes_:
        raise PredictionError(f"No price history for crop_id={crop_id}. Import more data first.")
    if mandi_id not in mandi_encoder.classes_:
        raise PredictionError(f"No price history for mandi_id={mandi_id}. Import more data first.")

    target = pd.to_datetime(target_date)

    # Use the crop+mandi's most recent known modal price as the
    # "rolling average" input, since we don't have future price history.
    history = load_price_history()
    recent = history[(history["crop_id"] == crop_id) & (history["mandi_id"] == mandi_id)]
    if recent.empty:
        raise PredictionError("No price history found for this crop and mandi combination.")
    rolling_avg_price = recent.sort_values("date")["modal_price"].tail(7).mean()

    features = pd.DataFrame(
        [
            {
                "day_of_year": target.dayofyear,
                "days_since_start": (target - start_date).days,
                "rolling_avg_price": rolling_avg_price,
                "crop_encoded": crop_encoder.transform([crop_id])[0],
                "mandi_encoded": mandi_encoder.transform([mandi_id])[0],
            }
        ]
    )[feature_cols]

    predicted_price = float(model.predict(features)[0])
    return {
        "cropId": crop_id,
        "mandiId": mandi_id,
        "predictedDate": target_date,
        "predictedPrice": round(predicted_price, 2),
        "modelVersion": bundle["model_name"],
    }


if __name__ == "__main__":
    # Quick manual test - adjust these ids to match rows in your database.
    result = predict_price(crop_id=1, mandi_id=1, target_date="2026-09-01")
    print(result)
