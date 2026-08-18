# SmartRaitha — Price Prediction (Python + scikit-learn)

This is a standalone service, separate from the Node backend, that trains a model on
historical mandi prices and serves predictions over a small HTTP API. The Node backend
calls it — it never runs Python code directly (matches section 32 of the project spec).

```
Historical Price Data (Postgres)
          ↓
     data_loader.py     (pulls + cleans data)
          ↓
       train.py         (feature engineering + train + evaluate + save model)
          ↓
   models/price_model.pkl
          ↓
      predict.py         (loads model, builds features, predicts)
          ↓
        app.py            (Flask API: POST /predict)
          ↓
  Node backend (mlClient.js → predictionController.generate)
          ↓
      React Native app
```

## 1. Install dependencies

```bash
cd ml
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in the **same** `DATABASE_URL` your Node backend uses — the ML service reads price
history directly from the same Neon Postgres database, it doesn't need its own copy.

## 3. Make sure you have enough data first

The model needs real history to learn from — run the Agmarknet import (from the backend)
a few times, ideally spread across a few different days, before training. `train.py` will
refuse to train (and tell you why) if there are fewer than 30 price records.

## 4. Train the model

```bash
python train.py
```

This will:
1. Pull all price records from Postgres (`data_loader.py`)
2. Build features: day of year, days since the dataset's earliest date, a 7-day rolling
   average price per crop+mandi, and encoded crop/mandi IDs
3. Split into train/test sets
4. Train **both** Linear Regression and Random Forest
5. Print MAE, RMSE, and R² for each on the held-out test set
6. Save whichever model scored the lower RMSE to `models/price_model.pkl`

You'll see output like:
```
Linear Regression: MAE=2.14  RMSE=2.89  R2=0.71
Random Forest: MAE=1.62  RMSE=2.20  R2=0.83
Selected model: random_forest
Saved to models/price_model.pkl
```

Re-run `train.py` any time you've imported more price data — there's no harm in
retraining, it just overwrites the saved model with a fresh one.

## 5. Run the prediction API

```bash
python app.py
```

Runs on `http://localhost:8000` by default (`GET /health` to check it's alive).

## 6. How the Node backend uses this

- `backend/services/mlClient.js` sends a POST request to `http://localhost:8000/predict`
  with `{ cropId, mandiId, targetDate }`.
- `backend/controllers/predictionController.js` → `generate()` calls that, then saves the
  result into the `Prediction` table via Prisma.
- The mobile app should call:

```
POST /api/predictions/generate
Authorization: Bearer <token>
Content-Type: application/json

{ "cropId": 1, "mandiId": 1, "targetDate": "2026-09-01" }
```

## Notes on the model itself

- **Why these two models specifically:** Linear Regression is the simplest reasonable
  baseline; Random Forest usually handles the seasonal, non-linear swings in crop prices
  better. Comparing both — rather than picking one because it "sounds more advanced" — is
  what your original spec asked for.
- **Why not a bigger model (XGBoost, neural nets, etc.):** with a few hundred to a few
  thousand price rows (realistic for a college project's data collection), a more complex
  model would likely just overfit. Simple models the both of you can actually explain to
  your evaluator are the right choice at this stage.
- **The UI should say "Estimated" or "Predicted" price, never "Guaranteed"** — this is
  already reflected in the field name `predictedPrice`.
- **Known limitation:** predictions for a crop/mandi with very little history (a handful
  of rows) won't be reliable even though the API will still return a number. Consider
  showing a "low confidence" note in the UI when a crop+mandi has fewer than ~15 price
  records — that's a good Phase 15 (UI refinement) addition.
