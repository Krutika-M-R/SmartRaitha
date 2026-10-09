require('dotenv').config();
const express = require('express');
const routes = require('./routes');
const prisma = require('./config/prisma');

const app = express();
app.use(express.json());
app.use('/api', routes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Basic error catcher for anything that slips through
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully.');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`SmartRaitha backend running on port ${PORT}`);
  });
}

startServer();
