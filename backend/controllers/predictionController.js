const { predictTwoDayPrices } = require('../services/agmarknetForecastService');

// GET /api/predictions?cropName=Tomato&state=Karnataka&mandiName=Bangalore&targetDate=2026-10-15
async function getLatest(req, res) {
  try {
    const { cropName, state, mandiName, targetDate } = req.query;
    if (![cropName, state, mandiName, targetDate].every((value) => typeof value === 'string' && value.trim())) {
      return res.status(400).json({ error: 'cropName, state, mandiName and targetDate are required.' });
    }
    const forecast = await predictTwoDayPrices({
      cropName: cropName.trim(),
      state: state.trim(),
      mandiNames: [mandiName.trim()],
      targetDate: targetDate.trim(),
    });
    res.json(forecast.predictions[0] || { message: 'No forecast is available for this mandi.' });
  } catch (err) {
    console.error('Agmarknet prediction failed:', err.message);
    res.status(502).json({ error: err.message || 'Could not generate an Agmarknet forecast.' });
  }
}

// POST /api/predictions/generate { cropName, state, mandiNames, targetDate }
// Forecasts from recent Agmarknet prices without using seeded database prices.
// This is the endpoint the mobile app should actually call.
async function generate(req, res) {
  try {
    const { cropName, state, mandiNames, targetDate } = req.body;
    if (!cropName || !state || !Array.isArray(mandiNames) || !targetDate) {
      return res.status(400).json({ error: 'cropName, state, mandiNames and targetDate are required.' });
    }

    const forecast = await predictTwoDayPrices({ cropName, state, mandiNames, targetDate });
    res.json(forecast);
  } catch (err) {
    console.error('Agmarknet price forecast failed:', err.message);
    res.status(502).json({ error: err.message });
  }
}

module.exports = { getLatest, generate };
