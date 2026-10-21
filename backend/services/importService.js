const axios = require('axios');

// This is the official "Current Daily Price of Various Commodities from
// Various Markets (Mandi)" dataset on data.gov.in, published by the
// Directorate of Marketing & Inspection (DMI), Ministry of Agriculture.
// Catalog page: https://www.data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi
const AGMARKNET_RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const AGMARKNET_BASE_URL = `https://api.data.gov.in/resource/${AGMARKNET_RESOURCE_ID}`;
const AGMARKNET_MAX_RESULT_WINDOW = 10000;

function getAgmarknetErrorDetail(data) {
  let message = data?.message;
  if (typeof message === 'string') {
    try {
      message = JSON.parse(message);
    } catch {
      return message;
    }
  }

  const rootCause = message?.error?.root_cause?.[0]?.reason;
  if (typeof rootCause === 'string') return rootCause;
  if (typeof message?.error?.message === 'string') return message.error.message;
  if (typeof message?.error === 'string') return message.error;
  if (typeof message === 'string') return message;
  return null;
}

function getAgmarknetApiKey() {
  const apiKey = [process.env.MANDI_API_KEY, process.env.AGMARKNET_API_KEY]
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
    const detail = getAgmarknetErrorDetail(response.data);
    if (response.data?.status === 'error' || response.data?.error) {
      throw new Error(`Agmarknet API reported an error${detail ? `: ${detail}` : '.'}`);
    }
    throw new Error(
      `Agmarknet API response did not contain a records list${detail ? `: ${detail}` : '.'}`,
    );
  }
  return response.data;
}

async function fetchAgmarknetPage(options) {
  const response = await fetchAgmarknetResponse(options);
  return response.records;
}

async function fetchAllAgmarknetRecords({ filters = {}, pageSize = 1000 } = {}) {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error('Agmarknet page size must be a positive integer.');
  }

  const records = [];
  let offset = 0;
  let total = null;

  while (
    offset < AGMARKNET_MAX_RESULT_WINDOW
    && (total === null || offset < total)
  ) {
    const response = await fetchAgmarknetResponse({ filters, limit: pageSize, offset });
    const page = response.records;
    records.push(...page);

    const reportedTotal = Number(response.total);
    if (Number.isFinite(reportedTotal) && reportedTotal >= 0) {
      total = reportedTotal;
    }

    if (page.length === 0) break;
    offset += page.length;
    if (total === null && page.length < pageSize) break;
  }

  return records;
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

module.exports = {
  fetchAgmarknetPage,
  fetchAgmarknetResponse,
  fetchAllAgmarknetRecords,
  getAgmarknetApiKey,
  normalizeRecord,
};
