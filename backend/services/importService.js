const axios = require('axios');
const prisma = require('../config/prisma');

// This is the official "Current Daily Price of Various Commodities from
// Various Markets (Mandi)" dataset on data.gov.in, published by the
// Directorate of Marketing & Inspection (DMI), Ministry of Agriculture.
// Catalog page: https://www.data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi
const AGMARKNET_RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const AGMARKNET_BASE_URL = `https://api.data.gov.in/resource/${AGMARKNET_RESOURCE_ID}`;

function getAgmarknetApiKey() {
  const apiKey = [process.env.AGMARKNET_API_KEY, process.env.MANDI_API_KEY]
    .map((value) => value?.trim())
    .find((value) => value && !/^your_/i.test(value));
  if (!apiKey) {
    throw new Error('Set AGMARKNET_API_KEY in backend/.env. MANDI_API_KEY is also supported for existing setups.');
  }
  return apiKey;
}

/**
 * Fetch a page of raw records and response metadata from the Agmarknet API.
 * filters is an object like { 'state.keyword': 'Karnataka', 'commodity.keyword': 'Tomato' }
 */
async function fetchAgmarknetResponse({ filters = {}, limit = 100, offset = 0 }) {
  const params = {
    'api-key': getAgmarknetApiKey(),
    format: 'json',
    limit,
    offset,
  };
  Object.entries(filters).forEach(([key, value]) => {
    params[`filters[${key}]`] = value;
  });

  let response;
  try {
    response = await axios.get(AGMARKNET_BASE_URL, { params, timeout: 15000 });
  } catch (error) {
    const status = error.response?.status;
    throw new Error(status
      ? `Agmarknet API request failed with HTTP ${status}.`
      : 'Agmarknet API request failed due to a network error or timeout.');
  }

  if (!Array.isArray(response.data?.records)) {
    throw new Error('Agmarknet API returned an invalid response. Check the API key and query filters.');
  }
  return response.data;
}

async function fetchAgmarknetPage(options) {
  const response = await fetchAgmarknetResponse(options);
  return response.records;
}

// Raw API fields look like:
// { state, district, market, commodity, variety, grade, arrival_date, min_price, max_price, modal_price }
// Agmarknet prices are rupees per quintal; the app stores prices per kilogram.
function normalizeRecord(record) {
  const parseNumber = (val) => {
    const n = parseFloat(val);
    return Number.isFinite(n) ? n : null;
  };

  const parsePricePerKg = (value) => {
    const pricePerQuintal = parseNumber(value);
    return pricePerQuintal == null ? null : pricePerQuintal / 100;
  };

  const parseDate = (val) => {
    // Agmarknet dates come as DD/MM/YYYY
    const [day, month, year] = (val || '').split('/');
    if (!day || !month || !year) return null;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (
      date.getUTCFullYear() !== Number(year) ||
      date.getUTCMonth() !== Number(month) - 1 ||
      date.getUTCDate() !== Number(day)
    ) {
      return null;
    }
    return date;
  };

  return {
    cropName: (record.commodity || '').trim(),
    mandiName: (record.market || '').trim(),
    state: (record.state || '').trim(),
    district: (record.district || '').trim() || null,
    minPrice: parsePricePerKg(record.min_price),
    maxPrice: parsePricePerKg(record.max_price),
    modalPrice: parsePricePerKg(record.modal_price),
    priceUnit: 'KG',
    arrivalDate: (record.arrival_date || '').trim(),
    date: parseDate(record.arrival_date),
  };
}

/**
 * Save one normalized record into Postgres, creating the Crop/Mandi rows
 * if they don't exist yet (findOrCreate pattern).
 */
async function saveRecord(normalized) {
  const { cropName, mandiName, state, district, minPrice, maxPrice, modalPrice, priceUnit, date } = normalized;

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
      priceUnit,
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

module.exports = {
  importAgmarknetData,
  fetchAgmarknetPage,
  fetchAgmarknetResponse,
  getAgmarknetApiKey,
  normalizeRecord,
};
