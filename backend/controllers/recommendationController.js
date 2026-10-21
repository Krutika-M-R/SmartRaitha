const { recommendBestMandi } = require('../services/recommendationService');

// GET /api/recommendations?cropName=Tomato&state=Karnataka
async function getRecommendation(req, res) {
  try {
    const cropName = typeof req.query.cropName === 'string' ? req.query.cropName.trim() : '';
    const state = typeof req.query.state === 'string' ? req.query.state.trim() : '';
    const district = typeof req.query.district === 'string' ? req.query.district.trim() : '';
    const originLatitude = req.query.latitude === undefined ? undefined : Number(req.query.latitude);
    const originLongitude = req.query.longitude === undefined ? undefined : Number(req.query.longitude);
    const quantityKg = req.query.quantityKg === undefined ? 100 : Number(req.query.quantityKg);

    if (!cropName) return res.status(400).json({ error: 'cropName is required.' });
    if (!state) return res.status(400).json({ error: 'state is required to find nearby mandi prices.' });
    if ((originLatitude === undefined) !== (originLongitude === undefined)
      || (originLatitude !== undefined
        && (!Number.isFinite(originLatitude) || originLatitude < -90 || originLatitude > 90
          || !Number.isFinite(originLongitude) || originLongitude < -180 || originLongitude > 180))
      || !Number.isFinite(quantityKg) || quantityKg <= 0) {
      return res.status(400).json({ error: 'Valid location coordinates and a positive quantityKg are required.' });
    }

    const result = await recommendBestMandi({
      cropName,
      state,
      district,
      originLatitude,
      originLongitude,
      quantityKg,
    });
    res.json(result);
  } catch (err) {
    console.error('Market recommendation failed:', err.message);
    res.status(502).json({ error: err.message || 'Could not generate recommendation.' });
  }
}

module.exports = { getRecommendation };
