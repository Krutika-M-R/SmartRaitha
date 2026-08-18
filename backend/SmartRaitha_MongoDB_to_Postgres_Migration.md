# SmartRaitha — Migrating the Backend from MongoDB to PostgreSQL (Neon) + Prisma

This guide takes your current SmartRaitha backend (Node.js + Express + MongoDB) and moves it to **Node.js + Express + PostgreSQL (Neon) + Prisma**, without touching your React Native/Expo app or your Python price-prediction model. Only the *database layer* changes — everything else (routes, business logic, JWT auth, profit calculation, recommendation logic) stays conceptually the same, just rewritten to talk to Prisma instead of Mongoose.

We do this in **4 phases**. Do not skip ahead — each phase should be tested and working before you move to the next one.

```
PHASE 1  →  Set up Neon + Prisma in your project
PHASE 2  →  Design the schema (replace Mongoose models)
PHASE 3  →  Rewrite controllers/routes to use Prisma
PHASE 4  →  Test everything, connect ML, clean up, deploy
```

---

## PHASE 1 — Set up Neon PostgreSQL + Prisma

### WHAT
We create a free PostgreSQL database on Neon (cloud-hosted, no local install needed) and install Prisma in your existing backend project so it can talk to that database.

### WHY
- **Neon** gives you a real PostgreSQL server without installing Postgres on your laptop — good for a team project where everyone needs to hit the same database.
- **Prisma** is an ORM: it lets you write JavaScript function calls instead of raw SQL, and it auto-generates a type-safe client from your schema.

### HOW

**Step 1 — Create the Neon database**
1. Go to https://neon.tech and sign up (GitHub login is easiest).
2. Click **New Project**. Name it `smartraitha`.
3. Once created, Neon shows you a **connection string** that looks like:
   ```
   postgresql://username:password@ep-xxxx.ap-south-1.aws.neon.tech/smartraitha?sslmode=require
   ```
4. Copy this — you'll need it in a moment.

**Step 2 — Install Prisma in your backend**

Open a terminal in your `backend/` folder (the same one that currently has Mongoose):

```bash
npm install prisma --save-dev
npm install @prisma/client
npx prisma init
```

This creates:
```
backend/
├── prisma/
│   └── schema.prisma      ← we edit this in Phase 2
└── .env                    ← Prisma adds DATABASE_URL here
```

**Step 3 — Set your `.env`**

Open `.env` and set:

```
DATABASE_URL="postgresql://username:password@ep-xxxx.ap-south-1.aws.neon.tech/smartraitha?sslmode=require"
JWT_SECRET=keep_your_existing_jwt_secret_here
PORT=5000
```

Keep your old `MONGO_URI` in there too for now (commented out) — we won't delete Mongoose until Phase 4, once Postgres is confirmed working. Don't delete a working system before the replacement works.

**Step 4 — Confirm the connection**

```bash
npx prisma db pull
```

If this runs without an error (even though there are no tables yet, it should just say "no tables found"), your connection string is correct and Neon is reachable.

✅ **Phase 1 checkpoint:** `npx prisma db pull` connects without an auth/network error. Don't move to Phase 2 until this works.

---

## PHASE 2 — Design the Prisma schema (replacing your Mongoose models)

### WHAT
We translate your MongoDB collections (`users`, `crops`, `mandis`, `prices`, `transportation_costs`, `predictions`) into a relational Prisma schema with proper foreign keys, then create the actual tables in Neon.

### WHY
MongoDB documents are flexible and can nest data inside each other. PostgreSQL is relational — instead of nesting, we **link tables with foreign keys**. This is a mindset change:

| MongoDB (before) | PostgreSQL (after) |
|---|---|
| `_id` (ObjectId) | `id` (auto-increment integer or UUID) |
| Embedded sub-documents | Separate tables + foreign keys |
| No enforced relationships | Foreign key constraints enforced by the DB |
| Flexible/optional fields anywhere | Fixed columns, explicit nullable fields |

### HOW

**Step 1 — Write the schema**

Replace the contents of `backend/prisma/schema.prisma` with this:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           Int      @id @default(autoincrement())
  name         String
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
}

model Crop {
  id     Int     @id @default(autoincrement())
  name   String  @unique
  prices Price[]
}

model Mandi {
  id              Int              @id @default(autoincrement())
  name            String
  state           String
  district        String?
  latitude        Float?
  longitude       Float?
  prices          Price[]
  transportCosts  TransportationCost[]
}

model Price {
  id         Int      @id @default(autoincrement())
  crop       Crop     @relation(fields: [cropId], references: [id])
  cropId     Int
  mandi      Mandi    @relation(fields: [mandiId], references: [id])
  mandiId    Int
  minPrice   Float
  maxPrice   Float
  modalPrice Float
  date       DateTime

  @@index([cropId, mandiId, date])
}

model TransportationCost {
  id            Int    @id @default(autoincrement())
  mandi         Mandi  @relation(fields: [mandiId], references: [id])
  mandiId       Int
  distanceKm    Float
  ratePerKm     Float
  estimatedCost Float
}

model Prediction {
  id            Int      @id @default(autoincrement())
  cropId        Int
  mandiId       Int
  predictedDate DateTime
  predictedPrice Float
  modelVersion  String?
  createdAt     DateTime @default(now())

  @@index([cropId, mandiId])
}
```

A few notes for beginners on what each Prisma keyword does:
- `@id @default(autoincrement())` — this is your primary key, auto-numbered (replaces Mongo's `_id`).
- `@unique` — no two rows can share this value (e.g. two users can't have the same email).
- `Crop prices Price[]` — this is a **relation field**; it doesn't create a column, it just tells Prisma "a Crop can have many Prices."
- `@relation(fields: [cropId], references: [id])` — this is the actual foreign key: `cropId` on the `Price` table points to `id` on the `Crop` table.
- `@@index([...])` — speeds up queries that filter/search by these fields often (matches what your original synopsis asked for: indexes on `crop_id`, `mandi_id`, `date`).

**Step 2 — Create the tables in Neon**

```bash
npx prisma migrate dev --name init
```

This does two things:
1. Sends `CREATE TABLE` statements to your Neon database.
2. Generates the Prisma Client (the JS functions you'll import in your code).

**Step 3 — Verify visually (optional but helpful)**

```bash
npx prisma studio
```

This opens a browser-based table editor for your Neon database — a nice way to check the tables exist and manually add a test row.

**Step 4 — Seed some sample data**

Create `backend/prisma/seed.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tomato = await prisma.crop.create({ data: { name: 'Tomato' } });
  const onion = await prisma.crop.create({ data: { name: 'Onion' } });

  const mandiA = await prisma.mandi.create({
    data: { name: 'Kolar Mandi', state: 'Karnataka', district: 'Kolar' }
  });
  const mandiB = await prisma.mandi.create({
    data: { name: 'Bangalore Mandi', state: 'Karnataka', district: 'Bengaluru Urban' }
  });

  await prisma.price.create({
    data: { cropId: tomato.id, mandiId: mandiA.id, minPrice: 20, maxPrice: 26, modalPrice: 24, date: new Date() }
  });
  await prisma.price.create({
    data: { cropId: tomato.id, mandiId: mandiB.id, minPrice: 24, maxPrice: 30, modalPrice: 28, date: new Date() }
  });

  await prisma.transportationCost.create({
    data: { mandiId: mandiA.id, distanceKm: 20, ratePerKm: 10, estimatedCost: 200 }
  });
  await prisma.transportationCost.create({
    data: { mandiId: mandiB.id, distanceKm: 70, ratePerKm: 10, estimatedCost: 700 }
  });

  console.log('Seed data created ✅');
}

main().finally(() => prisma.$disconnect());
```

Run it:
```bash
node prisma/seed.js
```

✅ **Phase 2 checkpoint:** `npx prisma studio` shows your tables with the seeded rows inside them.

---

## PHASE 3 — Rewrite controllers/routes to use Prisma instead of Mongoose

### WHAT
We go module by module — auth, crops/mandis, prices, profit calculator, recommendation engine — and swap Mongoose queries for Prisma queries. The URL endpoints and JSON response shapes stay the same, so your React Native app barely notices the change.

### WHY
Doing this module-by-module (not all at once) means you can test each piece with Postman before moving on, so if something breaks, you know exactly which change caused it.

### HOW

**Step 1 — Create a single shared Prisma client**

Create `backend/config/prisma.js`:

```javascript
const { PrismaClient } = require('@prisma/client');

// Reuse the same client everywhere instead of creating a new one per file
const prisma = new PrismaClient();

module.exports = prisma;
```

**Step 2 — Auth module (signup / login / me)**

Create/replace `backend/controllers/authController.js`:

```javascript
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

// POST /api/auth/signup
async function signup(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash }
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
}

// GET /api/auth/me  (needs auth middleware — see below)
async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true, createdAt: true }
  });
  res.json(user);
}

module.exports = { signup, login, me };
```

Create `backend/middleware/auth.js` (JWT verification, same idea as before, no DB-specific change needed):

```javascript
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = requireAuth;
```

**Step 3 — Crops & Mandis module**

`backend/controllers/cropController.js`:
```javascript
const prisma = require('../config/prisma');

// GET /api/crops
async function getCrops(req, res) {
  const crops = await prisma.crop.findMany({ orderBy: { name: 'asc' } });
  res.json(crops);
}

module.exports = { getCrops };
```

`backend/controllers/mandiController.js`:
```javascript
const prisma = require('../config/prisma');

// GET /api/mandis
async function getMandis(req, res) {
  const mandis = await prisma.mandi.findMany({ orderBy: { name: 'asc' } });
  res.json(mandis);
}

module.exports = { getMandis };
```

**Step 4 — Prices module**

`backend/controllers/priceController.js`:
```javascript
const prisma = require('../config/prisma');

// GET /api/prices?cropId=1
async function getPricesForCrop(req, res) {
  const cropId = Number(req.query.cropId);
  if (!cropId) return res.status(400).json({ error: 'cropId is required.' });

  const prices = await prisma.price.findMany({
    where: { cropId },
    include: { mandi: true },
    orderBy: { date: 'desc' }
  });
  res.json(prices);
}

// GET /api/prices/history?cropId=1&mandiId=2&days=30
async function getPriceHistory(req, res) {
  const cropId = Number(req.query.cropId);
  const mandiId = req.query.mandiId ? Number(req.query.mandiId) : undefined;
  const days = Number(req.query.days) || 30;

  const since = new Date();
  since.setDate(since.getDate() - days);

  const history = await prisma.price.findMany({
    where: { cropId, mandiId, date: { gte: since } },
    orderBy: { date: 'asc' }
  });
  res.json(history);
}

module.exports = { getPricesForCrop, getPriceHistory };
```

**Step 5 — Profit calculator module** (business logic stays the same — only the data-fetch part changes)

`backend/services/profitService.js`:
```javascript
const prisma = require('../config/prisma');

// Core formula, unchanged from your original design:
// Gross Revenue = Quantity x Price
// Total Cost    = Transportation + Other Costs
// Net Profit    = Gross Revenue - Total Cost
async function calculateProfit({ cropId, mandiId, quantityKg }) {
  const price = await prisma.price.findFirst({
    where: { cropId, mandiId },
    orderBy: { date: 'desc' }
  });
  if (!price) throw new Error('No price data found for this crop/mandi.');

  const transport = await prisma.transportationCost.findFirst({ where: { mandiId } });
  const transportCost = transport ? transport.estimatedCost : 0;

  const grossRevenue = quantityKg * price.modalPrice;
  const otherCosts = 0; // extend later (commission, loading charges, etc.)
  const totalCost = transportCost + otherCosts;
  const netProfit = grossRevenue - totalCost;

  return {
    modalPrice: price.modalPrice,
    grossRevenue,
    transportCost,
    otherCosts,
    totalCost,
    netProfit
  };
}

module.exports = { calculateProfit };
```

`backend/controllers/profitController.js`:
```javascript
const { calculateProfit } = require('../services/profitService');

// POST /api/profit/calculate  { cropId, mandiId, quantityKg }
async function calculate(req, res) {
  try {
    const { cropId, mandiId, quantityKg } = req.body;
    const result = await calculateProfit({
      cropId: Number(cropId),
      mandiId: Number(mandiId),
      quantityKg: Number(quantityKg)
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = { calculate };
```

**Step 6 — Recommendation module** (loops over all mandis for a crop, reuses `calculateProfit`)

`backend/services/recommendationService.js`:
```javascript
const prisma = require('../config/prisma');
const { calculateProfit } = require('./profitService');

async function recommendBestMandi({ cropId, quantityKg }) {
  const mandisWithPrice = await prisma.price.findMany({
    where: { cropId },
    distinct: ['mandiId'],
    include: { mandi: true }
  });

  const results = [];
  for (const entry of mandisWithPrice) {
    try {
      const profit = await calculateProfit({ cropId, mandiId: entry.mandiId, quantityKg });
      results.push({ mandi: entry.mandi, ...profit });
    } catch (e) {
      // skip mandis with no usable data
    }
  }

  results.sort((a, b) => b.netProfit - a.netProfit);
  const best = results[0];

  return {
    recommended: best,
    reason: best
      ? `${best.mandi.name} gives the highest estimated net profit after transportation cost.`
      : 'Not enough data to make a recommendation yet.',
    allOptions: results
  };
}

module.exports = { recommendBestMandi };
```

`backend/controllers/recommendationController.js`:
```javascript
const { recommendBestMandi } = require('../services/recommendationService');

// GET /api/recommendations?cropId=1&quantityKg=100
async function getRecommendation(req, res) {
  const cropId = Number(req.query.cropId);
  const quantityKg = Number(req.query.quantityKg) || 1;
  const result = await recommendBestMandi({ cropId, quantityKg });
  res.json(result);
}

module.exports = { getRecommendation };
```

**Step 7 — Wire up the routes**

`backend/routes/index.js`:
```javascript
const express = require('express');
const router = express.Router();

const requireAuth = require('../middleware/auth');
const authController = require('../controllers/authController');
const cropController = require('../controllers/cropController');
const mandiController = require('../controllers/mandiController');
const priceController = require('../controllers/priceController');
const profitController = require('../controllers/profitController');
const recommendationController = require('../controllers/recommendationController');

router.post('/auth/signup', authController.signup);
router.post('/auth/login', authController.login);
router.get('/auth/me', requireAuth, authController.me);

router.get('/crops', cropController.getCrops);
router.get('/mandis', mandiController.getMandis);

router.get('/prices', priceController.getPricesForCrop);
router.get('/prices/history', priceController.getPriceHistory);

router.post('/profit/calculate', requireAuth, profitController.calculate);
router.get('/recommendations', requireAuth, recommendationController.getRecommendation);

module.exports = router;
```

✅ **Phase 3 checkpoint:** every endpoint above returns correct JSON in Postman using the seeded data from Phase 2.

---

## PHASE 4 — Test, connect ML, clean up, deploy

### WHAT
We test the full flow end-to-end, plug in your existing Python price-prediction service (unchanged), remove the old MongoDB code, and get the app ready to run for real.

### WHY
This is where you confirm the migration didn't silently break anything, and make sure nothing insecure (old Mongo URI, secrets) is left behind.

### HOW

**Step 1 — Postman test sequence**

Test in this exact order, since later ones depend on earlier ones working:
1. `POST /api/auth/signup` → get back a token.
2. `POST /api/auth/login` → confirm you get a token again.
3. `GET /api/auth/me` with `Authorization: Bearer <token>` → confirm it returns your user.
4. `GET /api/crops` and `GET /api/mandis` → confirm seeded data shows up.
5. `GET /api/prices?cropId=1` → confirm both mandi prices show.
6. `POST /api/profit/calculate` with a real `cropId`, `mandiId`, `quantityKg` → check the maths by hand once.
7. `GET /api/recommendations?cropId=1&quantityKg=100` → confirm it picks the mandi with the higher net profit, not just the higher price.

**Step 2 — Connect your Python prediction service**

Nothing changes here architecturally — your Node backend still calls the Python service the same way it did before (HTTP call to a Flask/FastAPI endpoint, or a child process, depending on how you built it originally). The only new part is: once the Python service returns a predicted price, save it via Prisma instead of Mongoose:

```javascript
// backend/services/predictionService.js
const prisma = require('../config/prisma');

async function savePrediction({ cropId, mandiId, predictedDate, predictedPrice, modelVersion }) {
  return prisma.prediction.create({
    data: { cropId, mandiId, predictedDate: new Date(predictedDate), predictedPrice, modelVersion }
  });
}

module.exports = { savePrediction };
```

**Step 3 — Remove MongoDB code (only after Step 1 passes fully)**

```bash
npm uninstall mongoose
```

Delete your old `models/*.js` Mongoose schema files and the old Mongo connection file (e.g. `config/db.js` if it was Mongo-specific). Remove `MONGO_URI` from `.env`.

**Step 4 — Update `server.js`**

Make sure your entry file just imports the Express app and routes — no more `mongoose.connect(...)` call. Prisma connects automatically the first time a query runs.

```javascript
require('dotenv').config();
const express = require('express');
const routes = require('./routes');

const app = express();
app.use(express.json());
app.use('/api', routes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`SmartRaitha backend running on port ${PORT}`));
```

**Step 5 — Common errors and fixes**

| Error | Likely cause | Fix |
|---|---|---|
| `Can't reach database server` | Wrong `DATABASE_URL` or Neon project paused | Copy the connection string again from Neon dashboard; Neon free tier auto-sleeps and wakes on first query — just retry |
| `P2002: Unique constraint failed` | Duplicate email on signup | Expected — return a clean 409 error, don't crash |
| `PrismaClientInitializationError` | Forgot `npx prisma generate` after schema changes | Run `npx prisma generate` again |
| Migration fails halfway | Table already has conflicting data | On a dev database, safe to run `npx prisma migrate reset` (⚠️ wipes data) |
| JWT `invalid signature` | `JWT_SECRET` differs between old and new `.env` | Keep the exact same secret you used before, or all old tokens break |

**Step 6 — Final checklist before calling the migration done**

- [ ] All Phase 3 Postman tests pass
- [ ] `.env` has no leftover Mongo URI or unused secrets
- [ ] `mongoose` removed from `package.json`
- [ ] React Native app still works unchanged against the new backend (same endpoint paths, same response shapes)
- [ ] `npx prisma studio` shows real data, not just seed data, after a few manual test actions from the app
- [ ] Neon connection string is **not** committed to GitHub (check `.gitignore` includes `.env`)

---

## Quick reference: your new backend folder structure

```
backend/
├── config/
│   └── prisma.js
├── controllers/
│   ├── authController.js
│   ├── cropController.js
│   ├── mandiController.js
│   ├── priceController.js
│   ├── profitController.js
│   └── recommendationController.js
├── services/
│   ├── profitService.js
│   ├── recommendationService.js
│   └── predictionService.js
├── middleware/
│   └── auth.js
├── routes/
│   └── index.js
├── prisma/
│   ├── schema.prisma
│   └── seed.js
├── .env
├── server.js
└── package.json
```

That's the full migration. Work through the phases in order, test at each checkpoint, and you'll end up with the exact PostgreSQL/Neon/Prisma stack from your master prompt — without losing any of the profit-calculation or recommendation logic you already built.
