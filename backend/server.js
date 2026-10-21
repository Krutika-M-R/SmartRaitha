require('dotenv').config();
const express = require('express');
const routes = require('./routes');
const prisma = require('./config/prisma');
const { startAgmarknetCsvRefreshScheduler } = require('./services/liveMarketPriceService');

const app = express();
const mandiRoutes = require('./routes/mandi');
let databaseConnected = false;
app.use(express.json());
app.use('/api', routes);
app.use('/api/mandi', mandiRoutes);

app.get('/api/health', (req, res) => res.json({
  status: databaseConnected ? 'ok' : 'degraded',
  database: databaseConnected ? 'connected' : 'unavailable',
}));

// Basic error catcher for anything that slips through
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 5000;
const DATABASE_CONNECT_MAX_ATTEMPTS = 5;

async function startServer() {
  for (let attempt = 1; attempt <= DATABASE_CONNECT_MAX_ATTEMPTS; attempt++) {
    try {
      await prisma.$connect();
      databaseConnected = true;
      console.log('Database connected successfully.');
      break;
    } catch (error) {
      const canRetry = error.code === 'P1001' && attempt < DATABASE_CONNECT_MAX_ATTEMPTS;
      if (!canRetry) {
        console.error(
          `Database connection failed; starting Agmarknet live/CSV services without Neon: ${error.message}`,
        );
        break;
      }

      const delayMs = Math.min(1000 * (2 ** (attempt - 1)), 8000);
      console.warn(
        `Database is temporarily unreachable (attempt ${attempt}/${DATABASE_CONNECT_MAX_ATTEMPTS}); retrying in ${delayMs / 1000}s.`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  app.listen(PORT, () => {
    console.log(`SmartRaitha backend running on port ${PORT}`);
    startAgmarknetCsvRefreshScheduler();
  });
}

startServer();
