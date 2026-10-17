# SmartRaitha - Price Prediction (Python + scikit-learn)

The standalone Flask service trains and serves Random Forest price forecasts. The Node
backend calls the service; the mobile app never calls Python directly.

## Install dependencies

From `ml`, use Python 3.12:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Karnataka ten-year history

The model uses
`backend/data/agmarknet_karnataka_10yr_state_average_training_prices.csv`. The file
contains 269,151 usable daily statewide Karnataka observations for 96 crops from
2015-10-30 through 2025-10-30. Rows are statewide averages, not mandi-specific history.

To refresh the historical CSV from the project root, run:

```powershell
node .\ml\download_agmarknet_state_history.js
```

The upstream historical series currently ends in October 2025. Live or saved mandi
prices anchor forecasts to current prices.

Train the Random Forest from the project `ml` folder:

```powershell
.\.venv\Scripts\python.exe .\train_karnataka.py
```

This trains one Random Forest using crop, seasonal, recent-price and report-gap features;
it reports chronological-validation MAE/RMSE and saves
`ml/models/karnataka_price_forest.pkl`. A Random Forest is the only forecasting model.

The forecast endpoint uses the statewide Random Forest estimate as a baseline and adjusts
each selected mandi's estimate using that mandi's latest observed price relative to the
selected-market average. These adjusted prices are estimates, not forecasts trained on
ten years of mandi-specific observations. The historical file ends in October 2025, so
the current mandi prices supplied to the service anchor the forecast to current price
levels.

## Start the services

Run the backend and the Flask service in separate terminals. From `ml`:

```powershell
.\.venv\Scripts\python.exe .\app.py
```

The Flask API listens on `http://localhost:8000` by default. `GET /health` checks that it
is running. Set `ML_SERVICE_URL` in the backend environment if the service is hosted at a
different URL.

The backend's `POST /api/predictions/generate` endpoint gathers each requested mandi's
latest live price (or saved Agmarknet price), then calls `POST /forecast` with the crop,
the first forecast date, and the per-mandi prices. The Random Forest returns predictions
for that date and the following date. The mobile market screen requests tomorrow and
displays both days.

The ten-year training file covers Karnataka only. Forecast requests for other states are
rejected rather than silently using another model.

## Legacy crop/mandi ID endpoint

The separate `python train.py` workflow continues to train a Random Forest on database
history and save `ml/models/price_model.pkl` for the legacy `POST /predict` endpoint,
which accepts `{ "cropId": 1, "mandiId": 1, "targetDate": "2026-09-01" }`. That legacy
training workflow requires the `DATABASE_URL` described in `.env.example`.

Always label outputs as predicted or estimated prices, never guaranteed prices.
