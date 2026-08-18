const prisma = require('../config/prisma');

// GET /api/prices?cropId=1
async function getPricesForCrop(req, res) {
  try {
    const cropId = Number(req.query.cropId);
    if (!cropId) return res.status(400).json({ error: 'cropId is required.' });

    const prices = await prisma.price.findMany({
      where: { cropId },
      include: { mandi: true },
      orderBy: { date: 'desc' }
    });
    res.json(prices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch prices.' });
  }
}

// GET /api/prices/history?cropId=1&mandiId=2&days=30
async function getPriceHistory(req, res) {
  try {
    const cropId = Number(req.query.cropId);
    const mandiId = req.query.mandiId ? Number(req.query.mandiId) : undefined;
    const days = Number(req.query.days) || 30;

    if (!cropId) return res.status(400).json({ error: 'cropId is required.' });

    const since = new Date();
    since.setDate(since.getDate() - days);

    const history = await prisma.price.findMany({
      where: { cropId, mandiId, date: { gte: since } },
      orderBy: { date: 'asc' }
    });
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch price history.' });
  }
}

module.exports = { getPricesForCrop, getPriceHistory };
