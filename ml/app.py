"""
WHAT:  A small Flask API that wraps predict.py so the Node.js backend can
       call it over HTTP instead of running Python itself.
WHY:   Keeps Python/ML code out of the Node backend entirely (section 32
       of the project spec: don't mix Python into Express).
HOW:   Node's predictionController calls POST /predict with JSON body
       { cropId, mandiId, targetDate }, gets back a predicted price, and
       saves it into Postgres via Prisma.

Run:  python app.py
"""

import os
from flask import Flask, request, jsonify
from dotenv import load_dotenv

from predict import predict_price, PredictionError
from karnataka_forecast import (
    ForecastError,
    forecast_two_days,
    load_model as load_karnataka_model,
)

load_dotenv()

app = Flask(__name__)
karnataka_model = None


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/predict", methods=["POST"])
def predict():
    body = request.get_json(force=True, silent=True) or {}
    crop_id = body.get("cropId")
    mandi_id = body.get("mandiId")
    target_date = body.get("targetDate")

    if not crop_id or not mandi_id or not target_date:
        return jsonify({"error": "cropId, mandiId and targetDate are required."}), 400

    try:
        result = predict_price(int(crop_id), int(mandi_id), target_date)
        return jsonify(result)
    except PredictionError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500


@app.route("/forecast", methods=["POST"])
def forecast():
    global karnataka_model
    body = request.get_json(force=True, silent=True) or {}
    if not isinstance(body, dict):
        return jsonify({"error": "A JSON object is required."}), 400

    crop_name = body.get("cropName")
    state = body.get("state")
    target_date = body.get("targetDate")
    mandi_prices = body.get("mandiPrices")

    if (
        not isinstance(crop_name, str)
        or not crop_name.strip()
        or not isinstance(state, str)
        or not state.strip()
        or not isinstance(target_date, str)
        or not isinstance(mandi_prices, list)
    ):
        return jsonify({
            "error": "cropName, state, targetDate and mandiPrices are required.",
        }), 400
    if state.strip().casefold() != "karnataka":
        return jsonify({
            "error": "The ten-year Random Forest forecast is currently available only for Karnataka.",
        }), 400

    try:
        if karnataka_model is None:
            karnataka_model = load_karnataka_model()
        predictions = forecast_two_days(
            crop_name,
            target_date,
            mandi_prices,
            bundle=karnataka_model,
        )
        freshness = {item["dataFreshness"] for item in predictions}
        return jsonify({
            "dataSource": "Agmarknet Karnataka 10-year statewide averages",
            "dataFreshness": freshness.pop() if len(freshness) == 1 else "mixed",
            "predictions": predictions,
        })
    except ForecastError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        app.logger.exception("Karnataka Random Forest forecast failed")
        return jsonify({"error": f"Forecast failed: {str(e)}"}), 500


if __name__ == "__main__":
    port = int(os.getenv("ML_PORT", 8000))
    app.run(host="0.0.0.0", port=port)
