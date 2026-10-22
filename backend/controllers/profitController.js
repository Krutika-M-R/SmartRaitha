const { calculateProfit } = require('../services/profitService');

// POST /api/profit/calculate accepts a transport cost per km or a fixed fare, plus other costs.
async function calculate(req, res) {
  try {
    const {
      cropName,
      state,
      mandiName,
      quantityKg,
      originLatitude,
      originLongitude,
      transportCostPerKm,
      fixedTransportCost,
      otherCosts,
    } = req.body;
    const hasPerKmCost = transportCostPerKm !== undefined;
    const hasFixedTransportCost = fixedTransportCost !== undefined;
    const hasCustomTransportCost = hasPerKmCost || hasFixedTransportCost;
    if (!cropName || !state || !mandiName || !Number.isFinite(Number(quantityKg)) || Number(quantityKg) <= 0
      || originLatitude === null || originLatitude === undefined || String(originLatitude).trim() === ''
      || originLongitude === null || originLongitude === undefined || String(originLongitude).trim() === ''
      || !Number.isFinite(Number(originLatitude)) || !Number.isFinite(Number(originLongitude))
      || Number(originLatitude) < -90 || Number(originLatitude) > 90
      || Number(originLongitude) < -180 || Number(originLongitude) > 180
      || (hasPerKmCost && hasFixedTransportCost)
      || (hasPerKmCost && (transportCostPerKm === null || String(transportCostPerKm).trim() === ''
        || !Number.isFinite(Number(transportCostPerKm)) || Number(transportCostPerKm) < 0))
      || (hasFixedTransportCost && (fixedTransportCost === null || String(fixedTransportCost).trim() === ''
        || !Number.isFinite(Number(fixedTransportCost)) || Number(fixedTransportCost) < 0))
      || (hasCustomTransportCost && otherCosts === undefined)
      || (otherCosts !== undefined && (otherCosts === null || String(otherCosts).trim() === ''
        || !Number.isFinite(Number(otherCosts)) || Number(otherCosts) < 0))) {
      return res.status(400).json({
        error: 'Provide cropName, state, mandiName, a positive quantityKg, valid origin coordinates, and valid non-negative transport and other costs.',
      });
    }

    const result = await calculateProfit({
      cropName: cropName.trim(),
      state: state.trim(),
      mandiName: mandiName.trim(),
      quantityKg: Number(quantityKg),
      originLatitude: Number(originLatitude),
      originLongitude: Number(originLongitude),
      ...(hasPerKmCost ? { transportCostPerKm: Number(transportCostPerKm) } : {}),
      ...(hasFixedTransportCost ? { fixedTransportCost: Number(fixedTransportCost) } : {}),
      ...(otherCosts !== undefined ? { otherCosts: Number(otherCosts) } : {}),
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = { calculate };
