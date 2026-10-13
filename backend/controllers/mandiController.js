const { getAgmarknetCsvMandis } = require('../services/liveMarketPriceService');

// GET /api/mandis
async function getMandis(req, res) {
  try {
    const state = typeof req.query.state === 'string' ? req.query.state.trim() : undefined;
    const mandis = await getAgmarknetCsvMandis({ state });
    res.json(mandis);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch mandis.' });
  }
}

module.exports = { getMandis };
