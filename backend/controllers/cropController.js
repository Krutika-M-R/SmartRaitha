const prisma = require('../config/prisma');

// GET /api/crops
async function getCrops(req, res) {
  try {
    const crops = await prisma.crop.findMany({ orderBy: { name: 'asc' } });
    res.json(crops);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch crops.' });
  }
}

module.exports = { getCrops };
