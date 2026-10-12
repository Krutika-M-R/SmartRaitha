const { savePrediction, getLatestPrediction } = require('../services/predictionService');
const { getPredictedPrice } = require('../services/mlClient');

// POST /api/predictions  { cropId, mandiId, predictedDate, predictedPrice, modelVersion }
// Called by your backend after it gets a result back from the Python ML service.
async function create(req, res) {
  try {
    const { cropId, mandiId, predictedDate, predictedPrice, modelVersion } = req.body;
    if (!cropId || !mandiId || !predictedDate || !predictedPrice) {
      return res.status(400).json({ error: 'cropId, mandiId, predictedDate and predictedPrice are required.' });
    }
    const prediction = await savePrediction({ cropId, mandiId, predictedDate, predictedPrice, modelVersion });
    res.status(201).json(prediction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save prediction.' });
  }
}

// GET /api/predictions?cropId=1&mandiId=2
async function getLatest(req, res) {
  try {
    const { cropId, mandiId } = req.query;
    if (!cropId || !mandiId) {
      return res.status(400).json({ error: 'cropId and mandiId are required.' });
    }
    const prediction = await getLatestPrediction({ cropId, mandiId });
    res.json(prediction || { message: 'No prediction available yet.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch prediction.' });
  }
}

// POST /api/predictions/generate  { cropId, mandiId, targetDate }
// Calls the Python ML service to get a fresh prediction, then saves it.
// This is the endpoint the mobile app should actually call.
async function generate(req, res) {
  try {
    const { cropId, mandiId, targetDate } = req.body;
    if (!cropId || !mandiId || !targetDate) {
      return res.status(400).json({ error: 'cropId, mandiId and targetDate are required.' });
    }

    const prediction = await getPredictedPrice({ cropId, mandiId, targetDate });
    const saved = await savePrediction(prediction);
    res.status(201).json(saved);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}

module.exports = { create, getLatest, generate };
