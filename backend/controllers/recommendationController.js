const { recommendBestMandi } = require('../services/recommendationService');

// GET /api/recommendations?cropId=1&state=Karnataka
async function getRecommendation(req, res) {
  try {
    const cropId = Number(req.query.cropId);
    const state = typeof req.query.state === 'string' ? req.query.state.trim() : '';

    if (!Number.isInteger(cropId) || cropId <= 0) {
      return res.status(400).json({ error: 'A valid cropId is required.' });
    }
    if (!state) return res.status(400).json({ error: 'state is required to find nearby mandi prices.' });

    const result = await recommendBestMandi({ cropId, state });
    res.json(result);
  } catch (err) {
    console.error('Market recommendation failed:', err.message);
    res.status(502).json({ error: err.message || 'Could not generate recommendation.' });
  }
}

module.exports = { getRecommendation };
