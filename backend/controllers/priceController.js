const prisma = require('../config/prisma');
const { fetchAgmarknetPage, normalizeRecord } = require('../services/importService');

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

    // Compare markets using only the latest price reported for each mandi.
    const latestPricesByMandi = new Map();
    for (const price of prices) {
      if (!latestPricesByMandi.has(price.mandiId)) {
        latestPricesByMandi.set(price.mandiId, price);
      }
    }

    res.json([...latestPricesByMandi.values()]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch prices.' });
  }
}

// GET /api/prices/live?state=Karnataka&commodity=Tomato
async function getLivePrices(req, res) {
  try {
    const state = typeof req.query.state === 'string' ? req.query.state.trim() : '';
    const commodity = typeof req.query.commodity === 'string' ? req.query.commodity.trim() : '';
    if (!state || !commodity) {
      return res.status(400).json({ error: 'state and commodity are required for live mandi prices.' });
    }

    const records = await fetchAgmarknetPage({
      filters: {
        'state.keyword': state,
        'commodity.keyword': commodity,
      },
      limit: 100,
    });
    const latestByMarket = new Map();

    for (const record of records) {
      const price = normalizeRecord(record);
      if (!price.mandiName || !price.date || price.modalPrice == null || price.modalPrice <= 0) continue;

      const key = [price.state, price.district || '', price.mandiName].join('|').toLocaleLowerCase();
      const existing = latestByMarket.get(key);
      if (!existing || price.date > existing.date) latestByMarket.set(key, price);
    }

    const latestPrices = [...latestByMarket.values()];
    const newestReport = Math.max(...latestPrices.map((price) => price.date.getTime()));
    const mandis = await prisma.mandi.findMany({ where: { state } });
    const mandiIds = new Map(
      mandis.map((mandi) => [
        [mandi.name, mandi.district || ''].join('|').toLocaleLowerCase(),
        mandi.id,
      ]),
    );

    const prices = latestPrices
      .filter((price) => price.date.getTime() === newestReport)
      .sort((a, b) => b.modalPrice - a.modalPrice)
      .map((price) => {
        const mandiKey = [price.mandiName, price.district || ''].join('|').toLocaleLowerCase();
        const fallbackMandiKey = [price.mandiName, ''].join('|').toLocaleLowerCase();
        const mandiId = mandiIds.get(mandiKey) ?? mandiIds.get(fallbackMandiKey) ?? null;
        const marketId = [price.state, price.district || '', price.mandiName].join('|');

        return {
          id: marketId,
          mandiId,
          modalPrice: price.modalPrice,
          minPrice: price.minPrice,
          maxPrice: price.maxPrice,
          priceUnit: price.priceUnit,
          date: price.date.toISOString(),
          arrivalDate: price.arrivalDate,
          mandi: {
            id: marketId,
            name: price.mandiName,
            district: price.district,
            state: price.state,
          },
        };
      });

    res.json({ dataSource: 'Agmarknet', state, commodity, count: prices.length, records: prices });
  } catch (err) {
    console.error('Live mandi prices failed:', err.message);
    res.status(502).json({ error: err.message || 'Could not fetch live mandi prices.' });
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

module.exports = { getPricesForCrop, getLivePrices, getPriceHistory };
