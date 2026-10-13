const { fetchAllAgmarknetRecords } = require('../services/importService');
const { getAgmarknetCsvCrops } = require('../services/liveMarketPriceService');
const { getCropCatalog: getCropPlannerCatalog } = require('../services/cropPlannerService');

// GET /api/crops?state=Karnataka
async function getCrops(req, res) {
  const state = typeof req.query.state === 'string' ? req.query.state.trim() : '';
  try {
    const savedCrops = await getAgmarknetCsvCrops({ state });
    let records;
    try {
      records = await fetchAllAgmarknetRecords({
        filters: state ? { 'state.keyword': state } : {},
      });
    } catch (error) {
      if (savedCrops.length === 0) throw error;
      console.warn('Using saved Agmarknet crop names because the live crop list failed:', error.message);
      res.json(savedCrops);
      return;
    }

    const commodities = new Map();
    savedCrops.forEach((crop) => {
      commodities.set(crop.name.toLocaleLowerCase(), crop);
    });
    records.forEach((record) => {
      const name = typeof record.commodity === 'string' ? record.commodity.trim() : '';
      if (name && !commodities.has(name.toLocaleLowerCase())) {
        commodities.set(name.toLocaleLowerCase(), { id: name, name });
      }
    });
    res.json([...commodities.values()].sort((a, b) => a.name.localeCompare(b.name)));
  } catch (err) {
    console.error('Agmarknet crop list failed:', err.message);
    res.status(502).json({ error: err.message || 'Could not fetch crop names from Agmarknet.' });
  }
}

// Used by the crop planner; these profiles do not require database crop rows.
async function getCropCatalog(req, res) {
  res.json(getCropPlannerCatalog());
}

module.exports = { getCrops, getCropCatalog };
