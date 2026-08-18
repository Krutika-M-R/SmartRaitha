const prisma = require('../config/prisma');

// GET /api/mandis
async function getMandis(req, res) {
  try {
    const mandis = await prisma.mandi.findMany({ orderBy: { name: 'asc' } });
    res.json(mandis);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch mandis.' });
  }
}

module.exports = { getMandis };
