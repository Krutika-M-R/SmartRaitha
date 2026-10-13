const { calculateProfit } = require('../services/profitService');

// POST /api/profit/calculate { cropName, state, mandiName, quantityKg, originLatitude, originLongitude }
async function calculate(req, res) {
  try {
    const {
      cropName, state, mandiName, quantityKg, originLatitude, originLongitude,
    } = req.body;
    if (!cropName || !state || !mandiName || !Number.isFinite(Number(quantityKg)) || Number(quantityKg) <= 0
      || originLatitude === null || originLatitude === undefined || String(originLatitude).trim() === ''
      || originLongitude === null || originLongitude === undefined || String(originLongitude).trim() === ''
      || !Number.isFinite(Number(originLatitude)) || !Number.isFinite(Number(originLongitude))
      || Number(originLatitude) < -90 || Number(originLatitude) > 90
      || Number(originLongitude) < -180 || Number(originLongitude) > 180) {
      return res.status(400).json({
        error: 'cropName, state, mandiName, a positive quantityKg, and valid origin coordinates are required.',
      });
    }

    const result = await calculateProfit({
      cropName: cropName.trim(),
      state: state.trim(),
      mandiName: mandiName.trim(),
      quantityKg: Number(quantityKg),
      originLatitude: Number(originLatitude),
      originLongitude: Number(originLongitude),
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = { calculate };
