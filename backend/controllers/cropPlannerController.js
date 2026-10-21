const { getIndiaMonthYear } = require('../services/farmGuidanceService');
const { getCropPlan } = require('../services/cropPlannerService');

function readCoordinates(query) {
  const latitude = Number(query.latitude);
  const longitude = Number(query.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return null;
  }
  return { latitude, longitude };
}

async function getPlan(req, res) {
  const coordinates = readCoordinates(req.query);
  if (!coordinates) return res.status(400).json({ error: 'Valid latitude and longitude are required.' });

  const month = Number(req.query.month);
  const year = Number(req.query.year);
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) {
    return res.status(400).json({ error: 'A valid month and year are required.' });
  }

  const current = getIndiaMonthYear();
  const monthOffset = (year - current.year) * 12 + month - current.month;
  if (monthOffset < 1 || monthOffset > 6) {
    return res.status(400).json({ error: 'Choose a month within the next six months.' });
  }

  const farmSizeAcres = Number(req.query.farmSizeAcres ?? 1);
  if (!Number.isFinite(farmSizeAcres) || farmSizeAcres <= 0 || farmSizeAcres > 10000) {
    return res.status(400).json({ error: 'Farm size must be between 0 and 10,000 acres.' });
  }

  const soilType = String(req.query.soilType || 'unknown');
  const allowedSoils = ['unknown', 'red', 'black', 'clay', 'sandy', 'loamy', 'alluvial'];
  if (!allowedSoils.includes(soilType)) {
    return res.status(400).json({ error: 'Choose a supported soil type.' });
  }

  const irrigation = String(req.query.irrigation || 'rainfed');
  const allowedIrrigation = ['rainfed', 'borewell', 'canal', 'drip'];
  if (!allowedIrrigation.includes(irrigation)) {
    return res.status(400).json({ error: 'Choose a supported irrigation type.' });
  }

  const preferredCropIds = String(req.query.preferredCropIds || '')
    .split(',')
    .filter(Boolean)
    .map(Number);
  if (preferredCropIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    return res.status(400).json({ error: 'Crop preferences must be valid crop IDs.' });
  }

  try {
    const plan = await getCropPlan({
      ...coordinates,
      month,
      year,
      soilType,
      irrigation,
      farmSizeAcres,
      preferredCropIds,
    });
    return res.json(plan);
  } catch (error) {
    console.error('Crop planner failed:', error.response?.data || error.message);
    return res.status(502).json({ error: 'Could not build the crop plan from weather and market data. Please try again.' });
  }
}

module.exports = { getPlan };
