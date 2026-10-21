const axios = require('axios');
const { normalizeMandiName } = require('./marketUtils');

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const resolvedCoordinates = new Map();
const pendingLookups = new Map();
let lastNominatimRequestAt = 0;
let nominatimQueue = Promise.resolve();

const mandiCoordinates = {
  bagepalli: { latitude: 13.7836611, longitude: 77.7972379, coordinatePrecision: 'town' },
  bangalore: { latitude: 13.0159579, longitude: 77.5451162, coordinatePrecision: 'market' },
  bailahongal: { latitude: 15.816422, longitude: 74.8568692, coordinatePrecision: 'town' },
  belagavi: { latitude: 15.8572666, longitude: 74.5069343, coordinatePrecision: 'town' },
  chamarajanagar: { latitude: 11.9544201, longitude: 77.1069086, coordinatePrecision: 'town' },
  channagiri: { latitude: 14.0252, longitude: 75.925, coordinatePrecision: 'town' },
  channapatna: { latitude: 12.6593727, longitude: 77.2038931, coordinatePrecision: 'town' },
  gangavathi: { latitude: 15.4308872, longitude: 76.5319723, coordinatePrecision: 'town' },
  gundlupet: { latitude: 11.8294975, longitude: 76.6771708, coordinatePrecision: 'market' },
  haliyal: { latitude: 15.3299733, longitude: 74.7646665, coordinatePrecision: 'town' },
  hangal: { latitude: 14.7821772, longitude: 75.1356858, coordinatePrecision: 'town' },
  hanagal: { latitude: 14.7821772, longitude: 75.1356858, coordinatePrecision: 'town' },
  haliyala: { latitude: 15.3299733, longitude: 74.7646665, coordinatePrecision: 'town' },
  harappanahalli: { latitude: 14.7880219, longitude: 75.988032, coordinatePrecision: 'town' },
  harapanahalli: { latitude: 14.7880219, longitude: 75.988032, coordinatePrecision: 'town' },
  honnali: { latitude: 14.2389785, longitude: 75.6457434, coordinatePrecision: 'town' },
  hubballi: { latitude: 15.3518378, longitude: 75.1379848, coordinatePrecision: 'town' },
  hungund: { latitude: 16.06689, longitude: 76.059741, coordinatePrecision: 'town' },
  kanakagiri: { latitude: 15.5696792, longitude: 76.4189879, coordinatePrecision: 'town' },
  kolar: { latitude: 13.1805066, longitude: 78.2669329, coordinatePrecision: 'town' },
  kustagi: { latitude: 15.7571579, longitude: 76.190682, coordinatePrecision: 'town' },
  kushtagi: { latitude: 15.7571579, longitude: 76.190682, coordinatePrecision: 'town' },
  lingasugur: { latitude: 16.1563, longitude: 76.5242, coordinatePrecision: 'town' },
  mangaluru: { latitude: 12.8698101, longitude: 74.8430082, coordinatePrecision: 'town' },
  mysuru: { latitude: 12.3051828, longitude: 76.6553609, coordinatePrecision: 'town' },
  pandavapura: { latitude: 12.5011414, longitude: 76.6731501, coordinatePrecision: 'town' },
  ramanagara: { latitude: 12.7252766, longitude: 77.2804797, coordinatePrecision: 'town' },
  shikaripura: { latitude: 14.2639661, longitude: 75.3587796, coordinatePrecision: 'town' },
  sindhanur: { latitude: 15.7685584, longitude: 76.7549926, coordinatePrecision: 'town' },
  sulya: { latitude: 12.5576644, longitude: 75.3907575, coordinatePrecision: 'town' },
  thirthahalli: { latitude: 13.6834232, longitude: 75.226027, coordinatePrecision: 'market' },
  tumakuru: { latitude: 13.3400771, longitude: 77.1006208, coordinatePrecision: 'town' },
  yaragatti: { latitude: 16.1766665, longitude: 74.591903, coordinatePrecision: 'town' },
};

function getMandiCoordinates(mandiName, state) {
  if (state && normalizeMandiName(state) !== 'karnataka') return null;
  const key = normalizeMandiName(mandiName);
  return mandiCoordinates[key] ? { ...mandiCoordinates[key] } : null;
}

function searchLocation(query) {
  const request = nominatimQueue.then(async () => {
    const delay = Math.max(0, 1000 - (Date.now() - lastNominatimRequestAt));
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    lastNominatimRequestAt = Date.now();

    try {
      return await axios.get(NOMINATIM_SEARCH_URL, {
        params: {
          q: query,
          format: 'jsonv2',
          limit: 1,
          countrycodes: 'in',
          addressdetails: 1,
        },
        headers: { 'User-Agent': 'SmartRaitha/1.0' },
        timeout: 15000,
      });
    } catch (error) {
      const status = error.response?.status;
      throw new Error(status
        ? `Mandi coordinate lookup failed with HTTP ${status}.`
        : 'Mandi coordinate lookup failed due to a network error or timeout.');
    }
  });
  nominatimQueue = request.then(() => undefined, () => undefined);

  return request.then((response) => {

    const location = response.data?.[0];
    const latitude = Number(location?.lat);
    const longitude = Number(location?.lon);
    if (!location || !Number.isFinite(latitude) || latitude < 6 || latitude > 38
      || !Number.isFinite(longitude) || longitude < 68 || longitude > 98) {
      return null;
    }

    return {
      latitude,
      longitude,
      coordinatePrecision: location.type === 'marketplace' ? 'market' : 'town',
    };
  });
}

async function resolveMandiCoordinates(mandiName, district, state) {
  const knownCoordinates = getMandiCoordinates(mandiName, state);
  if (knownCoordinates) return knownCoordinates;

  const cacheKey = [
    normalizeMandiName(mandiName),
    normalizeMandiName(district),
    normalizeMandiName(state),
  ].join('|');
  if (resolvedCoordinates.has(cacheKey)) {
    return { ...resolvedCoordinates.get(cacheKey) };
  }
  if (pendingLookups.has(cacheKey)) return pendingLookups.get(cacheKey);

  const lookup = (async () => {
    const queries = [
      [mandiName, district, state, 'India'].filter(Boolean).join(', '),
      [district, state, 'India'].filter(Boolean).join(', '),
    ].filter((query, index, all) => query && all.indexOf(query) === index);

    for (const query of queries) {
      const coordinates = await searchLocation(query);
      if (coordinates) {
        resolvedCoordinates.set(cacheKey, coordinates);
        return { ...coordinates };
      }
    }

    throw new Error(`Could not resolve map coordinates for ${mandiName || 'the selected mandi'}.`);
  })();
  pendingLookups.set(cacheKey, lookup);

  try {
    return await lookup;
  } finally {
    pendingLookups.delete(cacheKey);
  }
}

module.exports = { getMandiCoordinates, resolveMandiCoordinates };
