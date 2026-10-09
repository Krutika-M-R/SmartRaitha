# SmartRaitha Backend — PostgreSQL (Neon) + Prisma

This is the migrated backend: Node.js + Express + PostgreSQL (hosted on Neon) + Prisma ORM,
replacing the earlier MongoDB/Mongoose version.

## 1. Install dependencies

```bash
npm install
```

## 2. Set up environment variables

Copy `.env.example` to `.env` and fill in your real Neon connection string and JWT secret:

```bash
cp .env.example .env
```

## 3. Create the database tables

```bash
npx prisma migrate dev --name init
```

## 4. (Optional) Add sample data

```bash
npm run seed
```

## 5. Run the server

```bash
npm run dev
```

Server runs on `http://localhost:5000` by default. Health check: `GET /api/health`.

## 6. Import real mandi price data (Agmarknet / data.gov.in)

Instead of only using the seed data, you can pull real daily mandi prices from the
government's open dataset.

**Get a free API key:**
1. Go to https://data.gov.in and sign up.
2. Go to **My Account → API Keys** and copy your key.
3. Paste it into `.env` as `AGMARKNET_API_KEY`.

**Run the import:**

```bash
npm run import:agmarknet -- --state Karnataka --commodity Tomato
```

This fetches records from the *"Current Daily Price of Various Commodities from Various
Markets (Mandi)"* dataset (published by the Directorate of Marketing & Inspection,
Ministry of Agriculture), cleans them, and stores them in your `Crop`, `Mandi`, and
`Price` tables — creating crops/mandis that don't exist yet automatically.

Start narrow (one state, one or two commodities) — the free tier is rate-limited and the
full national dataset is very large.

**Same thing via API** (useful for testing from Postman, or triggering later from an
admin screen):

```
POST /api/admin/import-prices
Authorization: Bearer <token>
Content-Type: application/json

{ "state": "Karnataka", "commodity": "Tomato" }
```

**Notes on the data:**
- Prices from Agmarknet are per **quintal** (100 kg), not per kg — the profit calculator
  in this backend currently assumes price-per-kg, so if you use imported data, either
  convert `quantityKg` to quintals before calling `/api/profit/calculate`, or divide the
  imported prices by 100 during import. This is a good thing to decide as a team before
  your next milestone.
- Some rows from the government dataset have missing/blank prices — `importService.js`
  silently skips those rather than inserting broken rows.
- Re-running the import doesn't overwrite existing crops/mandis (it looks them up first),
  but it does insert new `Price` rows each time, so running it daily builds up genuine
  historical data for your trend charts.

## Folder structure

```
config/         Shared Prisma client
controllers/    Route handler logic
services/       Reusable business logic (profit calc, recommendation, predictions)
middleware/     JWT auth middleware
routes/         All API routes, mounted under /api
prisma/         schema.prisma (DB schema) + seed.js (sample data)
server.js       App entry point
```

## API endpoints

| Method | Endpoint | Auth required | Description |
|---|---|---|---|
| POST | /api/auth/signup | No | Create account |
| POST | /api/auth/login | No | Log in, get JWT |
| POST | /api/auth/verify-code | No | Verify the six-digit signup email code |
| POST | /api/auth/google | No | Sign in or create an account with Google |
| GET | /api/auth/me | Yes | Get current user |
| GET | /api/crops | No | List all crops |
| GET | /api/mandis | No | List all mandis |
| GET | /api/prices?cropId= | No | Current prices for a crop |
| GET | /api/prices/history?cropId=&mandiId=&days= | No | Historical prices |
| POST | /api/profit/calculate | Yes | Calculate net profit for crop+mandi+quantity |
| GET | /api/recommendations?cropId=&quantityKg= | Yes | Best mandi recommendation |
| POST | /api/predictions | Yes | Save an ML price prediction |
| GET | /api/predictions?cropId=&mandiId= | No | Get latest prediction |
| POST | /api/admin/import-prices | Yes | Import real prices from Agmarknet for a state/commodity |

See `SmartRaitha_MongoDB_to_Postgres_Migration.md` for the full phase-by-phase explanation of
how this was migrated from MongoDB and why each piece is built this way.
