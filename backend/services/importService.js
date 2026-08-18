const axios = require('axios');
const prisma = require('../config/prisma');

// This is the official "Current Daily Price of Various Commodities from
// Various Markets (Mandi)" dataset on data.gov.in, published by the
// Directorate of Marketing & Inspection (DMI), Ministry of Agriculture.
// Catalog page: https://www.data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi
const AGMARKNET_RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const AGMARKNET_BASE_URL = `https://api.data.gov.in/resource/${AGMARKNET_RESOURCE_ID}`;

/**
 * Fetch one page of raw records from the Agmarknet API.
 * filters is an object like { 'state.keyword': 'Karnataka', 'commodity.keyword': 'Tomato' }
 */
async function fetchAgmarknetPage({ filters = {}, limit = 100, offset = 0 }) {
  const apiKey = process.env.AGMARKNET_API_KEY;
  if (!apiKey) {
    throw new Error('AGMARKNET_API_KEY is not set in .env. Get a free key from data.gov.in.');
  }

  const params = {
    'api-key': apiKey,
    format: 'json',
    limit,
    offset,
  };
  Object.entries(filters).forEach(([key, value]) => {
    params[`filters[${key}]`] = value;
  });

  const response = await axios.get(AGMARKNET_BASE_URL, { params });
  return response.data.records || [];
}

// Raw API fields look like:
// { state, district, market, commodity, variety, grade, arrival_date, min_price, max_price, modal_price }
// Prices in the raw data are per quintal (100 kg) as rupees, sometimes as strings.
function normalizeRecord(record) {
  const parseNumber = (val) => {
    const n = parseFloat(val);
    return Number.isFinite(n) ? n : null;
  };

  const parseDate = (val) => {
    // Agmarknet dates come as DD/MM/YYYY
    const [day, month, year] = (val || '').split('/');
    if (!day || !month || !year) return null;
    return new Date(`${year}-${month}-${day}`);
  };

  return {
    cropName: (record.commodity || '').trim(),
    mandiName: (record.market || '').trim(),
    state: (record.state || '').trim(),
    district: (record.district || '').trim() || null,
    minPrice: parseNumber(record.min_price),
    maxPrice: parseNumber(record.max_price),
    modalPrice: parseNumber(record.modal_price),
    date: parseDate(record.arrival_date),
  };
}

/**
 * Save one normalized record into Postgres, creating the Crop/Mandi rows
 * if they don't exist yet (findOrCreate pattern).
 */
async function saveRecord(normalized) {
  const { cropName, mandiName, state, district, minPrice, maxPrice, modalPrice, date } = normalized;

  // Skip incomplete rows rather than inserting broken data.
  if (!cropName || !mandiName || !state || minPrice == null || maxPrice == null || modalPrice == null || !date) {
    return { skipped: true };
  }

  const crop = await prisma.crop.upsert({
    where: { name: cropName },
    update: {},
    create: { name: cropName },
  });

  // Mandi names aren't globally unique (same market name can exist in
  // different states), so we look up by name + state together.
  let mandi = await prisma.mandi.findFirst({ where: { name: mandiName, state } });
  if (!mandi) {
    mandi = await prisma.mandi.create({ data: { name: mandiName, state, district } });
  }

  await prisma.price.create({
    data: {
      cropId: crop.id,
      mandiId: mandi.id,
      minPrice,
      maxPrice,
      modalPrice,
      date,
    },
  });

  return { skipped: false };
}

/**
 * Main entry point: pulls all pages for the given filters and stores them.
 */
async function importAgmarknetData({ filters = {}, maxPages = 5, pageSize = 100 }) {
  let imported = 0;
  let skipped = 0;

  for (let page = 0; page < maxPages; page++) {
    const offset = page * pageSize;
    const records = await fetchAgmarknetPage({ filters, limit: pageSize, offset });

    if (records.length === 0) break; // no more data

    for (const raw of records) {
      const normalized = normalizeRecord(raw);
      const result = await saveRecord(normalized);
      if (result.skipped) skipped++;
      else imported++;
    }
  }

  return { imported, skipped };
}

module.exports = { importAgmarknetData, fetchAgmarknetPage, normalizeRecord };
