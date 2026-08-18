const { importAgmarknetData } = require('../services/importService');

// POST /api/admin/import-prices  { state, commodity }
// Useful for triggering an import from Postman without touching the terminal,
// or later from an admin screen in the app.
async function runImport(req, res) {
  try {
    const { state, commodity } = req.body;

    const filters = {};
    if (state) filters['state.keyword'] = state;
    if (commodity) filters['commodity.keyword'] = commodity;

    const result = await importAgmarknetData({ filters, maxPages: 5, pageSize: 100 });
    res.json({ message: 'Import complete.', ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Import failed.' });
  }
}

module.exports = { runImport };
