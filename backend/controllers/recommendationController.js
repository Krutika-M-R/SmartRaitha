const { recommendBestMandi } = require('../services/recommendationService');

// GET /api/recommendations?cropId=1&quantityKg=100&latitude=12.97&longitude=77.59
async function getRecommendation(req, res) {
  try {
    const cropId = Number(req.query.cropId);
    const quantityKg = Number(req.query.quantityKg) || 1;
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);

    if (!cropId) return res.status(400).json({ error: 'cropId is required.' });
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude and longitude are required.' });
    }

    const result = await recommendBestMandi({ cropId, quantityKg, latitude, longitude });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not generate recommendation.' });
  }
}

module.exports = { getRecommendation };
