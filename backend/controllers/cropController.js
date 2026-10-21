const { fetchAllAgmarknetRecords } = require('../services/importService');
const {
  getAgmarknetCsvCrops,
} = require('../services/liveMarketPriceService');
const { getCropCatalog: getCropPlannerCatalog } = require('../services/cropPlannerService');
const { normalizeCropName, selectSellingCrops } = require('../services/sellingCropService');

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
      res.json(selectSellingCrops(savedCrops));
      return;
    }

    const commodities = new Map();
    savedCrops.forEach((crop) => {
      commodities.set(normalizeCropName(crop.name), crop);
    });
    const liveMarketCounts = new Map();
    records.forEach((record) => {
      const name = typeof record.commodity === 'string' ? record.commodity.trim() : '';
      if (name) {
        const key = normalizeCropName(name);
        liveMarketCounts.set(key, (liveMarketCounts.get(key) || 0) + 1);
        if (!commodities.has(key)) {
          commodities.set(key, { id: name, name });
        }
      }
    });
    const crops = [...commodities.values()].map((crop) => ({
      ...crop,
      marketCount: Math.max(
        crop.marketCount || 0,
        liveMarketCounts.get(normalizeCropName(crop.name)) || 0,
      ),
    }));
    res.json(selectSellingCrops(crops));
  } catch (err) {
    console.error('Agmarknet crop list failed:', err.message);
    res.status(502).json({ error: err.message || 'Could not fetch crop names from Agmarknet.' });
  }
}

// Used by the crop planner; these profiles do not require database crop rows.
async function getCropCatalog(req, res) {
  res.json(getCropPlannerCatalog());
}

module.exports = { getCrops, getCropCatalog, selectSellingCrops };
