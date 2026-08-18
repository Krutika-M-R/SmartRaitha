require('dotenv').config();
const { importAgmarknetData } = require('../services/importService');

// Usage:
//   node scripts/importAgmarknetData.js
//   node scripts/importAgmarknetData.js --state Karnataka --commodity Tomato
//
// Edit STATE / COMMODITY below, or pass them as CLI flags, to control what gets imported.
// Keep this narrow at first (one state, one or two commodities) - the full
// national dataset is large and the free data.gov.in tier is rate-limited.

function getArg(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index !== -1 ? process.argv[index + 1] : fallback;
}

async function main() {
  const state = getArg('--state', 'Karnataka');
  const commodity = getArg('--commodity', 'Tomato');

  const filters = {};
  if (state) filters['state.keyword'] = state;
  if (commodity) filters['commodity.keyword'] = commodity;

  console.log(`Importing Agmarknet data for state="${state}" commodity="${commodity}"...`);

  const { imported, skipped } = await importAgmarknetData({ filters, maxPages: 5, pageSize: 100 });

  console.log(`Done. Imported ${imported} price records, skipped ${skipped} incomplete rows.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
