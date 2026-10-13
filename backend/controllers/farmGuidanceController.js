const {
  getFarmGuidance,
  getIndiaMonthYear,
  getSeasonalCropAdvice,
} = require('../services/farmGuidanceService');

function readCoordinates(query) {
  const latitude = Number(query.latitude);
  const longitude = Number(query.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return null;
  }
  return { latitude, longitude };
}

// GET /api/farm-guidance?latitude=12.97&longitude=77.59
async function getGuidance(req, res) {
  try {
    const coordinates = readCoordinates(req.query);
    if (!coordinates) {
      return res.status(400).json({ error: 'Valid latitude and longitude are required.' });
    }

    const guidance = await getFarmGuidance(coordinates);
    res.json(guidance);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(502).json({ error: 'Could not fetch farm weather guidance.' });
  }
}

function getSeasonalGuidance(req, res) {
  const coordinates = readCoordinates(req.query);
  if (!coordinates) {
    return res.status(400).json({ error: 'Valid latitude and longitude are required.' });
  }

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

  return res.json(getSeasonalCropAdvice({ ...coordinates, month, year }));
}

module.exports = { getGuidance, getSeasonalGuidance };
