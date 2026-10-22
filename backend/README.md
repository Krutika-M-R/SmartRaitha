# SmartRaitha Backend

The backend uses Node.js, Express, Prisma, and Neon PostgreSQL for user accounts.
Agmarknet prices and mandi directory data are loaded from the live API and the local
CSV snapshot at `data/agmarknet_current_prices.csv`.

## Setup

1. Run `npm install`.
2. Copy `.env.example` to `.env` and configure `DATABASE_URL`, `JWT_SECRET`, SMTP
   settings, and `MANDI_API_KEY` (or `AGMARKNET_API_KEY`).
3. Apply database migrations and regenerate Prisma Client:

   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

4. Start the backend with `npm run dev`.

The application-managed `public` schema retains only the `User` table and Prisma's
`_prisma_migrations` history table. The cleanup migration drops the app's crop, mandi,
price, transport, prediction, and Agmarknet tracking tables. Neon-managed `neon_auth`
tables are preserved. User sign-in and other account features continue to use
`public.User`.

## Market data

Live Agmarknet records are preferred. If no live report exists, recommendations,
comparisons, and profit calculations use the latest verified CSV report for the same
crop, state, and mandi. Prices are never copied across mandis or crops. The selected
mandi must have its own report to be eligible for profit calculation.

The CSV refreshes on backend startup and every six hours. When reports are fetched,
CSV rows are keyed by crop, mandi, variety, grade, and report date. This preserves
captured older reports as new dates arrive; it cannot recover reports that were never
saved or are no longer returned by Agmarknet. Prices are converted from rupees per
quintal to rupees per kilogram.

The CSV is a last-known price snapshot, not a complete historical archive or mandi
directory. Comparison lists markets present in the CSV or live results; it cannot
guarantee all Karnataka mandis. The crop planner uses bundled agronomic profiles and
weather normals and does not provide market price or profit estimates.

## Assistant

LittleLeaf answers app-usage questions from a built-in knowledge base and handles
market, weather, transport, profit, and forecast questions using SmartRaitha's own
services and data. It does not call an external AI provider and does not require an
AI API key. Live market-data features may still use `MANDI_API_KEY` for Agmarknet;
this is separate from an AI provider key.

If Neon is unreachable after startup retries, the server still starts in degraded mode
so live/CSV market-price routes can work. Features that require user data remain
unavailable until Neon reconnects. `GET /api/health` reports `degraded` in that state.

## API

| Method | Endpoint | Auth | Description |
|---|---|---:|---|
| POST | `/api/auth/signup` | No | Create a user account |
| POST | `/api/auth/verify-code` | No | Verify signup and sign in |
| POST | `/api/auth/password-reset/request` | No | Request password reset |
| POST | `/api/auth/password-reset/confirm` | No | Confirm password reset |
| POST | `/api/auth/login` | No | Sign in with email and password |
| POST | `/api/auth/google` | No | Google sign in |
| GET | `/api/auth/me` | Yes | Get current user |
| PUT | `/api/auth/profile` | Yes | Update current user's profile |
| GET | `/api/crops?state=` | No | List Agmarknet commodities |
| GET | `/api/crops/catalog` | No | List bundled crop-planner profiles |
| GET | `/api/mandis?state=` | No | List mandis found in the CSV snapshot |
| GET | `/api/prices/live?state=&commodity=` | No | Compare live and saved prices |
| GET | `/api/prices/history?cropName=&state=&mandiName=&days=` | No | Read saved CSV reports |
| GET | `/api/farm-guidance?latitude=&longitude=` | Yes | Local weather and guidance |
| GET | `/api/farm-guidance/seasonal?latitude=&longitude=&month=&year=` | Yes | Seasonal crop suggestion |
| GET | `/api/farm-guidance/planner?...` | Yes | Crop plan from profiles and climate normals |
| POST | `/api/profit/calculate` | Yes | Estimate net profit for a priced mandi |
| GET | `/api/recommendations?cropName=&state=` | Yes | Recommend a mandi using location and net return |
| GET | `/api/predictions?cropName=&state=&mandiName=&targetDate=` | No | Forecast a mandi price |
| POST | `/api/predictions/generate` | Yes | Forecast prices for selected mandis |
| POST | `/api/assistant` | Yes | Ask the SmartRaitha assistant |
