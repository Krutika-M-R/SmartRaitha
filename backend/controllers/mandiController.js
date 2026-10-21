const { getAgmarknetCsvMandis } = require('../services/liveMarketPriceService');
const { resolveMandiCoordinates } = require('../services/mandiCoordinateService');

// GET /api/mandis
async function getMandis(req, res) {
  try {
    const state = typeof req.query.state === 'string' ? req.query.state.trim() : undefined;
    const mandis = await getAgmarknetCsvMandis({ state });
    const mandisWithCoordinates = await Promise.all(mandis.map(async (mandi) => {
      const coordinates = await resolveMandiCoordinates(mandi.name, mandi.district, mandi.state);
      return {
        ...mandi,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        coordinatePrecision: coordinates.coordinatePrecision,
      };
    }));
    res.json(mandisWithCoordinates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch mandis.' });
  }
}

module.exports = { getMandis };
