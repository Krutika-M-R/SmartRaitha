const { calculateProfit } = require('../services/profitService');

// POST /api/profit/calculate  { cropId, mandiId, quantityKg }
async function calculate(req, res) {
  try {
    const { cropId, mandiId, quantityKg } = req.body;
    if (!cropId || !mandiId || !quantityKg) {
      return res.status(400).json({ error: 'cropId, mandiId and quantityKg are required.' });
    }

    const result = await calculateProfit({
      cropId: Number(cropId),
      mandiId: Number(mandiId),
      quantityKg: Number(quantityKg)
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = { calculate };
