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
    const transportCostPerKm = req.query.transportCostPerKm === undefined
      ? undefined
      : Number(req.query.transportCostPerKm);
    const fixedTransportCost = req.query.fixedTransportCost === undefined
      ? undefined
      : Number(req.query.fixedTransportCost);
    const otherCosts = req.query.otherCosts === undefined ? undefined : Number(req.query.otherCosts);
    const hasCustomTransportCost = transportCostPerKm !== undefined || fixedTransportCost !== undefined;

    if (!cropName) return res.status(400).json({ error: 'cropName is required.' });
    if (!state) return res.status(400).json({ error: 'state is required to find nearby mandi prices.' });
    if ((originLatitude === undefined) !== (originLongitude === undefined)
      || (originLatitude !== undefined
        && (!Number.isFinite(originLatitude) || originLatitude < -90 || originLatitude > 90
          || !Number.isFinite(originLongitude) || originLongitude < -180 || originLongitude > 180))
      || !Number.isFinite(quantityKg) || quantityKg <= 0
      || (transportCostPerKm !== undefined
        && (typeof req.query.transportCostPerKm !== 'string'
          || req.query.transportCostPerKm.trim() === ''
          || !Number.isFinite(transportCostPerKm) || transportCostPerKm < 0))
      || (fixedTransportCost !== undefined
        && (typeof req.query.fixedTransportCost !== 'string'
          || req.query.fixedTransportCost.trim() === ''
          || !Number.isFinite(fixedTransportCost) || fixedTransportCost < 0))
      || (transportCostPerKm !== undefined && fixedTransportCost !== undefined)
      || (hasCustomTransportCost && otherCosts === undefined)
      || (otherCosts !== undefined
        && (typeof req.query.otherCosts !== 'string'
          || req.query.otherCosts.trim() === '' || !Number.isFinite(otherCosts) || otherCosts < 0))) {
      return res.status(400).json({
        error: 'Provide valid location coordinates, a positive quantityKg, and non-negative transport and other costs.',
      });
    }

    const result = await recommendBestMandi({
      cropName,
      state,
      district,
      originLatitude,
      originLongitude,
      quantityKg,
      transportCostPerKm,
      fixedTransportCost,
      otherCosts,
    });
    res.json(result);
  } catch (err) {
    console.error('Market recommendation failed:', err.message);
    res.status(502).json({ error: err.message || 'Could not generate recommendation.' });
  }
}

module.exports = { getRecommendation };
