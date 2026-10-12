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

Signup verification codes are sent to the email address entered during registration using
the SMTP settings in `.env`.

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

`MANDI_API_KEY` is also accepted for existing installations. The Home screen's
market recommendation fetches the latest published Agmarknet daily prices for the
selected crop and the state detected from the device location; it does not use the
seed prices for this recommendation. The reported modal price is converted from
rupees per quintal to rupees per kilogram, and transport costs are not included.

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
- Prices from Agmarknet are per **quintal** (100 kg); new imports are normalized to
  rupees per kilogram before storage. Existing database prices are marked `UNKNOWN` by
  the migration because their source units cannot be inferred safely. Re-seed or
  re-import market records after migrating to enable price-based crop planner estimates.
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
| POST | /api/auth/signup | No | Create account and send a six-digit code to the signup email |
| POST | /api/auth/verify-code | No | Verify signup email code and sign the user in |
| POST | /api/auth/password-reset/request | No | Send a password reset code to a verified account email |
| POST | /api/auth/password-reset/confirm | No | Verify reset code, change password, and send confirmation email |
| POST | /api/auth/login | No | Log in with email and password; get JWT |
| POST | /api/auth/google | No | Sign in or create an account with Google |
| GET | /api/auth/me | Yes | Get current user |
| GET | /api/crops | No | List all crops |
| GET | /api/mandis | No | List all mandis |
| GET | /api/prices?cropId= | No | Current prices for a crop |
| GET | /api/prices/live?state=&commodity= | No | Current Agmarknet mandi prices for market comparison |
| GET | /api/prices/history?cropId=&mandiId=&days= | No | Historical prices |
| GET | /api/farm-guidance?latitude=&longitude= | Yes | Current local weather and crop guidance |
| GET | /api/farm-guidance/seasonal?latitude=&longitude=&month=&year= | Yes | Location-based crop suggestion for one of the next six months |
| GET | /api/farm-guidance/planner?latitude=&longitude=&month=&year=&soilType=&irrigation=&farmSizeAcres=&preferredCropIds= | Yes | Personalized six-month crop plan with climate normals and nearby prices |
| POST | /api/profit/calculate | Yes | Calculate net profit for crop+mandi+quantity |
| GET | /api/recommendations?cropId=&state= | Yes | Highest current Agmarknet mandi price for the crop and state |
| POST | /api/predictions | Yes | Save an ML price prediction |
| GET | /api/predictions?cropId=&mandiId= | No | Get latest prediction |
| POST | /api/admin/import-prices | Yes | Import real prices from Agmarknet for a state/commodity |

See `SmartRaitha_MongoDB_to_Postgres_Migration.md` for the full phase-by-phase explanation of
how this was migrated from MongoDB and why each piece is built this way.
