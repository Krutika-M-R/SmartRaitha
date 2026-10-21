# SmartRaitha — Full Project

```
smartraitha-project/
├── backend/    Node.js + Express + PostgreSQL (Neon) + Prisma
├── mobile/     React Native + Expo Go
└── ml/         Python + scikit-learn (price prediction)
```

## Run order

1. **backend** — set up `.env`, run migrations, seed data, `npm run dev`
   (see `backend/README.md`)
2. **ml** — train the Karnataka ten-year Random Forest with `python train_karnataka.py`,
   then start the forecast API with `python app.py` (see `ml/README.md`)
3. **mobile** — set `BASE_URL` in `services/api.js`, then `npx expo start`
   (see `mobile/README.md`)

## How the three pieces connect

```
React Native (mobile)
      │  REST API
      ▼
Node + Express (backend)  ──HTTP /forecast──▶ Flask (ml/app.py)
      │                                          ▲
      ▼                                          │
PostgreSQL (Neon)                  scikit-learn Random Forest
                                                 ▲
                           Karnataka 10-year Agmarknet CSV
```

The backend is the only thing the mobile app talks to. The ML service is only ever
called by the backend (`services/mlClient.js`), never directly by the app — this keeps
Python out of the mobile/backend boundary entirely, per the original project spec.

See `backend/SmartRaitha_MongoDB_to_Postgres_Migration.md` for the full phase-by-phase
explanation of how the backend was migrated from MongoDB to this stack.
