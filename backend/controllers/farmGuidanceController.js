const { getFarmGuidance } = require('../services/farmGuidanceService');

// GET /api/farm-guidance?latitude=12.97&longitude=77.59
async function getGuidance(req, res) {
  try {
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Valid latitude and longitude are required.' });
    }

    const guidance = await getFarmGuidance({ latitude, longitude });
    res.json(guidance);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(502).json({ error: 'Could not fetch farm weather guidance.' });
  }
}

module.exports = { getGuidance };
