const { recommendBestMandi } = require('../services/recommendationService');

// GET /api/recommendations?cropId=1&quantityKg=100
async function getRecommendation(req, res) {
  try {
    const cropId = Number(req.query.cropId);
    const quantityKg = Number(req.query.quantityKg) || 1;
    if (!cropId) return res.status(400).json({ error: 'cropId is required.' });

    const result = await recommendBestMandi({ cropId, quantityKg });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not generate recommendation.' });
  }
}

module.exports = { getRecommendation };
