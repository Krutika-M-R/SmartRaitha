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

load_dotenv()

app = Flask(__name__)


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


if __name__ == "__main__":
    port = int(os.getenv("ML_PORT", 8000))
    app.run(host="0.0.0.0", port=port)
