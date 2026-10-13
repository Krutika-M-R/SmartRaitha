const { normalizeMandiName } = require('../services/marketUtils');
const {
  getLatestPricesByMarket,
  getLiveMarketPrices,
  getAgmarknetCsvMandis,
  getAgmarknetCsvPrices,
} = require('../services/liveMarketPriceService');

// GET /api/prices?cropName=Tomato&state=Karnataka
async function getPricesForCrop(req, res) {
  try {
    const cropName = typeof req.query.cropName === 'string' ? req.query.cropName.trim() : '';
    const state = typeof req.query.state === 'string' ? req.query.state.trim() : '';
    if (!cropName || !state) {
      return res.status(400).json({ error: 'cropName and state are required.' });
    }

    const { prices } = await getLiveMarketPrices({ cropName, state });
    res.json(getLatestPricesByMarket(prices));
  } catch (err) {
    console.error('CSV/live Agmarknet prices failed:', err.message);
    res.status(502).json({ error: err.message || 'Could not fetch Agmarknet prices.' });
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

    const { prices: livePrices, marketScope } = await getLiveMarketPrices({
      cropName: commodity,
      state,
    });
    const liveRecords = getLatestPricesByMarket(livePrices)
      .sort((a, b) => b.modalPrice - a.modalPrice)
      .map((price) => {
        const marketId = [price.state, price.district || '', price.mandiName].join('|');

        return {
          id: marketId,
          modalPrice: price.modalPrice,
          minPrice: price.minPrice,
          maxPrice: price.maxPrice,
          priceUnit: price.priceUnit,
          date: price.date.toISOString(),
          arrivalDate: price.arrivalDate,
          hasLivePrice: price.dataFreshness === 'live',
          hasPrice: true,
          dataFreshness: price.dataFreshness,
          ageDays: price.ageDays,
          mandi: {
            id: marketId,
            name: price.mandiName,
            district: price.district,
            state: price.state,
            latitude: null,
            longitude: null,
          },
        };
      });
    const liveByName = new Map(
      liveRecords.map((record) => [normalizeMandiName(record.mandi.name), record]),
    );
    const mandis = await getAgmarknetCsvMandis({ state });
    const recordsByMandi = new Map();

    for (const mandi of mandis) {
      const key = normalizeMandiName(mandi.name);
      const liveRecord = liveByName.get(key);
      const record = liveRecord
        ? {
          ...liveRecord,
          mandi: {
            ...liveRecord.mandi,
            district: liveRecord.mandi.district || mandi.district,
            latitude: null,
            longitude: null,
          },
        }
        : {
          id: `directory:${mandi.id}`,
          modalPrice: null,
          minPrice: null,
          maxPrice: null,
          priceUnit: null,
          date: null,
          arrivalDate: null,
          hasLivePrice: false,
          hasPrice: false,
          dataFreshness: null,
          ageDays: null,
          mandi: {
            id: `directory:${mandi.id}`,
            name: mandi.name,
            district: mandi.district,
            state: mandi.state,
            latitude: mandi.latitude,
            longitude: mandi.longitude,
          },
        };
      const existing = recordsByMandi.get(key);
      if (!existing || (!existing.mandi.latitude && record.mandi.latitude)) {
        recordsByMandi.set(key, record);
      }
    }

    for (const record of liveRecords) {
      const key = normalizeMandiName(record.mandi.name);
      if (!recordsByMandi.has(key)) recordsByMandi.set(key, record);
    }

    const records = [...recordsByMandi.values()]
      .sort((a, b) => {
        if (a.hasPrice !== b.hasPrice) return a.hasPrice ? -1 : 1;
        if (a.ageDays !== b.ageDays && a.ageDays != null && b.ageDays != null) {
          return a.ageDays - b.ageDays;
        }
        return a.mandi.name.localeCompare(b.mandi.name);
      });

    res.json({
      dataSource: 'Agmarknet',
      state,
      commodity,
      marketScope,
      count: records.length,
      pricedCount: liveRecords.length,
      liveCount: liveRecords.filter((record) => record.hasLivePrice).length,
      records,
    });
  } catch (err) {
    console.error('Live mandi prices failed:', err.message);
    res.status(502).json({ error: err.message || 'Could not fetch live mandi prices.' });
  }
}

// GET /api/prices/history?cropName=Tomato&state=Karnataka&mandiName=Mysuru%20APMC&days=30
async function getPriceHistory(req, res) {
  try {
    const cropName = typeof req.query.cropName === 'string' ? req.query.cropName.trim() : '';
    const state = typeof req.query.state === 'string' ? req.query.state.trim() : '';
    const mandiName = typeof req.query.mandiName === 'string' ? req.query.mandiName.trim() : '';
    const days = Number(req.query.days) || 30;
    if (!cropName || !state) {
      return res.status(400).json({ error: 'cropName and state are required.' });
    }
    const prices = await getAgmarknetCsvPrices({ cropName, state });
    const since = Date.now() - (Math.max(1, days) * 24 * 60 * 60 * 1000);
    const history = prices
      .filter((price) => (!mandiName
        || normalizeMandiName(price.mandiName) === normalizeMandiName(mandiName))
        && price.date.getTime() >= since)
      .sort((a, b) => a.date - b.date);
    res.json(history);
  } catch (err) {
    console.error('CSV Agmarknet price history failed:', err.message);
    res.status(500).json({ error: 'Could not fetch Agmarknet price history.' });
  }
}

module.exports = { getPricesForCrop, getLivePrices, getPriceHistory };
