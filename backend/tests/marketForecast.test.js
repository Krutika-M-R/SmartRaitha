const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const axios = require('axios');
const testCsvPath = path.join(os.tmpdir(), `smartraitha-agmarknet-test-${process.pid}.csv`);
process.env.AGMARKNET_CSV_PATH = testCsvPath;
const prisma = { crop: {}, mandi: {}, price: {} };
const { buildTwoDayForecast } = require('../services/agmarknetForecastService');
const {
  fetchAllAgmarknetRecords,
  getAgmarknetApiKey,
} = require('../services/importService');
const {
  getLatestPricesByMarket,
  parseAgmarknetCsv,
  getAgmarknetCsvCrops,
  refreshAgmarknetCsv,
} = require('../services/liveMarketPriceService');
const { rankMarketPrices, recommendBestMandi } = require('../services/recommendationService');
const { predictTwoDayPrices } = require('../services/agmarknetForecastService');
const { calculateProfit } = require('../services/profitService');
const priceController = require('../controllers/priceController');
const cropController = require('../controllers/cropController');
const {
  estimateTransportation, TRANSPORT_RATE_PER_KM,
} = require('../services/transportEstimateService');

let nextMockId = 1;
prisma.crop.upsert = async ({ create }) => ({ id: nextMockId++, ...create });
prisma.mandi.findFirst = async () => null;
prisma.mandi.create = async ({ data }) => ({ id: nextMockId++, ...data });
prisma.price.findFirst = async () => null;
prisma.price.create = async () => ({ id: nextMockId++ });
prisma.price.update = async () => ({ id: nextMockId++ });
prisma.price.findMany = async () => [];

test.after(async () => {
  await fs.rm(testCsvPath, { force: true });
});

test('prefers MANDI_API_KEY when both supported API key names are set', () => {
  const originalMandiKey = process.env.MANDI_API_KEY;
  const originalAgmarknetKey = process.env.AGMARKNET_API_KEY;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  process.env.AGMARKNET_API_KEY = 'test-agmarknet-key';

  try {
    assert.equal(getAgmarknetApiKey(), 'test-mandi-key');
  } finally {
    if (originalMandiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalMandiKey;
    if (originalAgmarknetKey === undefined) delete process.env.AGMARKNET_API_KEY;
    else process.env.AGMARKNET_API_KEY = originalAgmarknetKey;
  }
});

test('fetches every Agmarknet page when the API reports more records', async () => {
  const originalApiKey = process.env.MANDI_API_KEY;
  const originalGet = axios.get;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  const offsets = [];
  axios.get = async (_url, { params }) => {
    offsets.push(params.offset);
    const count = params.offset === 0 ? 1000 : 501;
    return {
      data: {
        total: 1501,
        records: Array.from({ length: count }, (_, index) => ({
          id: params.offset + index,
        })),
      },
    };
  };

  try {
    const records = await fetchAllAgmarknetRecords();
    assert.equal(records.length, 1501);
    assert.deepEqual(offsets, [0, 1000]);
  } finally {
    axios.get = originalGet;
    if (originalApiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalApiKey;
  }
});

test('stops at Agmarknet maximum result window instead of requesting an invalid page', async () => {
  const originalApiKey = process.env.MANDI_API_KEY;
  const originalGet = axios.get;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  const offsets = [];
  axios.get = async (_url, { params }) => {
    offsets.push(params.offset);
    return {
      data: {
        total: 10188,
        records: Array.from({ length: 1000 }, (_, index) => ({
          id: params.offset + index,
        })),
      },
    };
  };

  try {
    const records = await fetchAllAgmarknetRecords();
    assert.equal(records.length, 10000);
    assert.deepEqual(offsets, [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000]);
  } finally {
    axios.get = originalGet;
    if (originalApiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalApiKey;
  }
});

test('reports Agmarknet API errors from its response payload', async () => {
  const originalApiKey = process.env.MANDI_API_KEY;
  const originalGet = axios.get;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  axios.get = async () => ({
    data: {
      status: 'error',
      message: JSON.stringify({
        error: { root_cause: [{ reason: 'Result window is too large.' }] },
      }),
    },
  });

  try {
    await assert.rejects(
      fetchAllAgmarknetRecords(),
      /Agmarknet API reported an error: Result window is too large\./,
    );
  } finally {
    axios.get = originalGet;
    if (originalApiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalApiKey;
  }
});

test('parses saved Agmarknet CSV prices only for the requested crop and state', () => {
  const csv = [
    'state,district,mandi_name,crop_name,price_date,min_price_per_kg,max_price_per_kg,modal_price_per_kg,price_unit,source',
    'Karnataka,Mysuru,"Mysuru, East",Tomato,2026-10-10,20,22,21,KG,Agmarknet',
    'Karnataka,Bengaluru,Bengaluru,Onion,2026-10-11,18,20,19,KG,Agmarknet',
    'Tamil Nadu,Salem,Salem,Tomato,2026-10-12,15,17,16,KG,Agmarknet',
  ].join('\n');

  const prices = parseAgmarknetCsv(csv, {
    cropName: 'Tomato',
    state: 'Karnataka',
    now: Date.parse('2026-10-13T00:00:00.000Z'),
  });

  assert.equal(prices.length, 1);
  assert.equal(prices[0].mandiName, 'Mysuru, East');
  assert.equal(prices[0].modalPrice, 21);
  assert.equal(prices[0].dataFreshness, 'cached');
  assert.equal(prices[0].ageDays, 3);
});

test('matches saved CSV prices when crop punctuation differs from the selected crop name', () => {
  const csv = [
    'state,district,mandi_name,crop_name,price_date,min_price_per_kg,max_price_per_kg,modal_price_per_kg,price_unit,source',
    'Karnataka,Mysuru,Mysuru APMC,Cucumbar(Kheera),2026-10-13,10,12,11,KG,Agmarknet',
  ].join('\n');

  const prices = parseAgmarknetCsv(csv, {
    cropName: 'Cucumbar (Kheera)',
    state: 'Karnataka',
    now: Date.parse('2026-10-13T00:00:00.000Z'),
  });

  assert.equal(prices.length, 1);
  assert.equal(prices[0].modalPrice, 11);
  assert.equal(prices[0].dataFreshness, 'cached');
});

test('serves crop names from the CSV when the live crop API is unavailable', async () => {
  const originalApiKey = process.env.MANDI_API_KEY;
  const originalGet = axios.get;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  await fs.writeFile(testCsvPath, [
    'state,district,mandi_name,crop_name,variety,grade,arrival_date,price_date,min_price_rupees_per_quintal,max_price_rupees_per_quintal,modal_price_rupees_per_quintal,min_price_per_kg,max_price_per_kg,modal_price_per_kg,price_unit,source,retrieved_at_utc',
    'Karnataka,Mysuru,Mysuru,Tomato,,,13/10/2026,2026-10-13,2000,2200,2100,20,22,21,KG,Agmarknet,2026-10-13T00:00:00.000Z',
    'Karnataka,Kolar,Kolar,Onion,,,13/10/2026,2026-10-13,1800,2000,1900,18,20,19,KG,Agmarknet,2026-10-13T00:00:00.000Z',
  ].join('\n'));
  axios.get = async () => { throw new Error('Agmarknet temporarily unavailable'); };

  try {
    const response = {
      json(body) { this.body = body; },
      status(status) { this.statusCode = status; return this; },
    };
    await cropController.getCrops({ query: { state: 'Karnataka' } }, response);

    assert.equal(response.statusCode, undefined);
    assert.deepEqual(response.body.map((crop) => crop.name), ['Onion', 'Tomato']);
  } finally {
    axios.get = originalGet;
    if (originalApiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalApiKey;
  }
});

test('preserves older report dates when a newer live Agmarknet price is received', async () => {
  const originalApiKey = process.env.MANDI_API_KEY;
  const originalGet = axios.get;
  const originalFindMany = prisma.price.findMany;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  await fs.writeFile(testCsvPath, [
    'state,district,mandi_name,crop_name,variety,grade,arrival_date,price_date,min_price_rupees_per_quintal,max_price_rupees_per_quintal,modal_price_rupees_per_quintal,min_price_per_kg,max_price_per_kg,modal_price_per_kg,price_unit,source,retrieved_at_utc',
    'Karnataka,Mysuru,Mysuru APMC,CSV Update Test Crop,,,12/10/2026,2026-10-12,1800,2000,1900,18,20,19,KG,Agmarknet,2026-10-12T00:00:00.000Z',
  ].join('\n'));
  axios.get = async () => ({
    data: {
      records: [{
        state: 'Karnataka',
        district: 'Mysuru',
        market: 'Mysuru APMC',
        commodity: 'CSV Update Test Crop',
        variety: 'Other',
        grade: 'FAQ',
        arrival_date: '13/10/2026',
        min_price: '2000',
        max_price: '2200',
        modal_price: '2100',
      }],
    },
  });
  prisma.price.findMany = async () => [];

  try {
    await require('../services/liveMarketPriceService').getLiveMarketPrices({
      cropName: 'CSV Update Test Crop',
      state: 'Karnataka',
    });
    const csv = await fs.readFile(testCsvPath, 'utf8');

    assert.match(csv, /2026-10-13/);
    assert.match(csv, /2026-10-12/);
    assert.match(csv, /CSV Update Test Crop/);
    assert.match(csv, /21,KG,Agmarknet/);
    const olderPrice = parseAgmarknetCsv(csv, {
      cropName: 'CSV Update Test Crop',
      state: 'Karnataka',
    }).find((price) => price.date.toISOString().slice(0, 10) === '2026-10-12');
    assert.equal(olderPrice.modalPrice, 19);
  } finally {
    axios.get = originalGet;
    prisma.price.findMany = originalFindMany;
    if (originalApiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalApiKey;
  }
});

test('uses the latest CSV price when the Agmarknet live request fails', async () => {
  const originalApiKey = process.env.MANDI_API_KEY;
  const originalGet = axios.get;
  const originalFindMany = prisma.price.findMany;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  await fs.writeFile(testCsvPath, [
    'state,district,mandi_name,crop_name,variety,grade,arrival_date,price_date,min_price_rupees_per_quintal,max_price_rupees_per_quintal,modal_price_rupees_per_quintal,min_price_per_kg,max_price_per_kg,modal_price_per_kg,price_unit,source,retrieved_at_utc',
    'Karnataka,Mysuru,Mysuru APMC,CSV Offline Test Crop,,,10/10/2026,2026-10-10,1800,2000,1900,18,20,19,KG,Agmarknet,2026-10-10T00:00:00.000Z',
    'Karnataka,Mysuru,Mysuru APMC,CSV Offline Test Crop,,,12/10/2026,2026-10-12,2000,2200,2100,20,22,21,KG,Agmarknet,2026-10-12T00:00:00.000Z',
  ].join('\n'));
  axios.get = async () => { throw new Error('Agmarknet unavailable'); };
  prisma.price.findMany = async () => { throw new Error('Database unavailable'); };

  try {
    const result = await require('../services/liveMarketPriceService').getLiveMarketPrices({
      cropName: 'CSV Offline Test Crop',
      state: 'Karnataka',
    });

    assert.equal(result.prices.length, 1);
    assert.equal(result.prices[0].modalPrice, 21);
    assert.equal(result.prices[0].arrivalDate, '2026-10-12');
    assert.equal(result.prices[0].dataFreshness, 'cached');
  } finally {
    axios.get = originalGet;
    prisma.price.findMany = originalFindMany;
    if (originalApiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalApiKey;
  }
});

test('uses each mandi own saved CSV price without copying it to other mandis', async () => {
  const originalApiKey = process.env.MANDI_API_KEY;
  const originalGet = axios.get;
  const originalFindMany = prisma.price.findMany;
  const originalMandiFindMany = prisma.mandi.findMany;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  await fs.writeFile(testCsvPath, [
    'state,district,mandi_name,crop_name,variety,grade,arrival_date,price_date,min_price_rupees_per_quintal,max_price_rupees_per_quintal,modal_price_rupees_per_quintal,min_price_per_kg,max_price_per_kg,modal_price_per_kg,price_unit,source,retrieved_at_utc',
    'Karnataka,Mysuru,Mysuru APMC,Cucumbar(Kheera),,,13/10/2026,2026-10-13,2000,2200,2100,20,22,21,KG,Agmarknet,2026-10-13T00:00:00.000Z',
    'Karnataka,Kolar,Kolar APMC,Cucumbar(Kheera),,,13/10/2026,2026-10-13,2400,2600,2500,24,26,25,KG,Agmarknet,2026-10-13T00:00:00.000Z',
    'Karnataka,Bengaluru,Bengaluru APMC,Onion,,,13/10/2026,2026-10-13,2000,2200,2100,20,22,21,KG,Agmarknet,2026-10-13T00:00:00.000Z',
  ].join('\n'));
  const registeredMandis = [
    { id: 1, name: 'Mysuru APMC', district: 'Mysuru', state: 'Karnataka', latitude: 12.3, longitude: 76.6 },
    { id: 2, name: 'Kolar APMC', district: 'Kolar', state: 'Karnataka', latitude: 13.1, longitude: 78.1 },
    { id: 3, name: 'Bengaluru APMC', district: 'Bengaluru', state: 'Karnataka', latitude: 12.9, longitude: 77.6 },
  ];
  prisma.price.findMany = async () => [];
  prisma.mandi.findMany = async () => registeredMandis;
  axios.get = async (url) => {
    if (url.includes('api.data.gov.in')) return { data: { records: [] } };
    if (url === 'https://nominatim.openstreetmap.org/search') {
      return { data: [{ lat: '13.1', lon: '78.1' }] };
    }
    return {
      data: {
        code: 'Ok',
        routes: [{
          distance: 1000,
          geometry: { coordinates: [[77.6, 12.9], [78.1, 13.1]] },
        }],
      },
    };
  };

  try {
    const fallback = await require('../services/liveMarketPriceService').getLiveMarketPrices({
      cropName: 'Cucumbar (Kheera)',
      state: 'Karnataka',
    });
    assert.equal(fallback.prices.length, 2);
    assert.equal(fallback.prices.find((price) => price.mandiName === 'Kolar APMC').modalPrice, 25);
    assert.equal(fallback.prices.some((price) => price.mandiName === 'Bengaluru APMC'), false);

    const recommendation = await recommendBestMandi({
      cropName: 'Cucumbar (Kheera)',
      state: 'Karnataka',
    });
    assert.equal(recommendation.recommended.mandi.name, 'Kolar APMC');
    assert.equal(recommendation.recommended.modalPrice, 25);
    assert.equal(recommendation.recommended.dataFreshness, 'cached');
    assert.equal(recommendation.allOptions.length, 2);
    assert.equal(recommendation.allOptions.some((option) => option.mandi.name === 'Bengaluru APMC'), false);

    const comparisonResponse = {
      status: (status) => ({ json: (body) => ({ status, body }) }),
      json(body) { this.body = body; },
    };
    await priceController.getLivePrices({
      query: { state: 'Karnataka', commodity: 'Cucumbar (Kheera)' },
    }, comparisonResponse);
    assert.equal(comparisonResponse.body.liveCount, 0);
    assert.equal(comparisonResponse.body.pricedCount, 2);
    assert.equal(
      comparisonResponse.body.records.find((record) => record.mandi.name === 'Kolar APMC').modalPrice,
      25,
    );
    assert.equal(
      comparisonResponse.body.records.find((record) => record.mandi.name === 'Kolar APMC').dataFreshness,
      'cached',
    );
    const noReportRecord = comparisonResponse.body.records.find(
      (record) => record.mandi.name === 'Bengaluru APMC',
    );
    assert.equal(noReportRecord.modalPrice, null);
    assert.equal(noReportRecord.hasPrice, false);

    const profit = await calculateProfit({
      cropName: 'Cucumbar (Kheera)',
      mandiName: 'Kolar APMC',
      state: 'Karnataka',
      quantityKg: 100,
      originLatitude: 12.9,
      originLongitude: 77.6,
    });
    assert.equal(profit.modalPrice, 25);
    assert.equal(profit.grossRevenue, 2500);
    assert.equal(profit.dataFreshness, 'cached');
  } finally {
    axios.get = originalGet;
    prisma.price.findMany = originalFindMany;
    prisma.mandi.findMany = originalMandiFindMany;
    if (originalApiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalApiKey;
  }
});

test('does not copy Gundlupet Alasande Gram price to mandis without their own report', async () => {
  const originalApiKey = process.env.MANDI_API_KEY;
  const originalGet = axios.get;
  const originalFindMany = prisma.price.findMany;
  const originalMandiFindMany = prisma.mandi.findMany;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  await fs.writeFile(testCsvPath, [
    'state,district,mandi_name,crop_name,variety,grade,arrival_date,price_date,min_price_rupees_per_quintal,max_price_rupees_per_quintal,modal_price_rupees_per_quintal,min_price_per_kg,max_price_per_kg,modal_price_per_kg,price_unit,source,retrieved_at_utc',
    'Karnataka,Chamarajanagar,Gundlupet APMC,Alasande Gram,,,13/10/2026,2026-10-13,6800,7200,7000,68,72,70,KG,Agmarknet,2026-10-13T00:00:00.000Z',
  ].join('\n'));
  prisma.price.findMany = async () => [];
  prisma.mandi.findMany = async () => [
    { id: 1, name: 'Gundlupet APMC', district: 'Chamarajanagar', state: 'Karnataka' },
    { id: 2, name: 'Mysuru APMC', district: 'Mysuru', state: 'Karnataka' },
  ];
  axios.get = async (url) => {
    if (url.includes('api.data.gov.in')) return { data: { records: [] } };
    if (url === 'https://nominatim.openstreetmap.org/search') {
      return { data: [{ lat: '13.0', lon: '77.7' }] };
    }
    return {
      data: {
        code: 'Ok',
        routes: [{
          distance: 1000,
          geometry: { coordinates: [[77.6, 12.9], [77.7, 13.0]] },
        }],
      },
    };
  };

  try {
    const { prices } = await require('../services/liveMarketPriceService').getLiveMarketPrices({
      cropName: 'Alasande Gram',
      state: 'Karnataka',
    });
    assert.equal(prices.length, 1);
    assert.equal(prices[0].mandiName, 'Gundlupet APMC');
    assert.equal(prices[0].modalPrice, 70);
    assert.equal(prices[0].dataFreshness, 'cached');
  } finally {
    axios.get = originalGet;
    prisma.price.findMany = originalFindMany;
    prisma.mandi.findMany = originalMandiFindMany;
    if (originalApiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalApiKey;
  }
});

test('uses CSV prices for mandis without consulting the Neon directory', async () => {
  const originalApiKey = process.env.MANDI_API_KEY;
  const originalGet = axios.get;
  const originalFindMany = prisma.price.findMany;
  const originalMandiFindMany = prisma.mandi.findMany;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  await fs.writeFile(testCsvPath, [
    'state,district,mandi_name,crop_name,variety,grade,arrival_date,price_date,min_price_rupees_per_quintal,max_price_rupees_per_quintal,modal_price_rupees_per_quintal,min_price_per_kg,max_price_per_kg,modal_price_per_kg,price_unit,source,retrieved_at_utc',
    'Karnataka,Mysuru,Unregistered APMC,Unregistered Mandi Test Crop,,,13/10/2026,2026-10-13,2000,2200,2100,20,22,21,KG,Agmarknet,2026-10-13T00:00:00.000Z',
  ].join('\n'));
  axios.get = async () => ({ data: { records: [] } });
  prisma.price.findMany = async () => [];
  prisma.mandi.findMany = async () => [];

  try {
    const result = await require('../services/liveMarketPriceService').getLiveMarketPrices({
      cropName: 'Unregistered Mandi Test Crop',
      state: 'Karnataka',
    });

    assert.equal(result.prices.length, 1);
    assert.equal(result.prices[0].mandiName, 'Unregistered APMC');
    assert.equal(result.prices[0].modalPrice, 21);
  } finally {
    axios.get = originalGet;
    prisma.price.findMany = originalFindMany;
    prisma.mandi.findMany = originalMandiFindMany;
    if (originalApiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalApiKey;
  }
});

test('returns live prices without reading or writing Neon mandi and price rows', async () => {
  const originalApiKey = process.env.MANDI_API_KEY;
  const originalGet = axios.get;
  const originalFindMany = prisma.price.findMany;
  const originalMandiFindMany = prisma.mandi.findMany;
  const originalMandiFindFirst = prisma.mandi.findFirst;
  const originalMandiCreate = prisma.mandi.create;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  axios.get = async () => ({
    data: {
      records: [{
        state: 'Karnataka',
        district: 'Unknown',
        market: 'Unregistered Live APMC',
        commodity: 'Unregistered Live Mandi Test Crop',
        arrival_date: '13/10/2026',
        min_price: '2000',
        max_price: '2200',
        modal_price: '2100',
      }],
    },
  });
  prisma.price.findMany = async () => { throw new Error('Neon prices must not be read'); };
  prisma.mandi.findMany = async () => { throw new Error('Neon mandis must not be read'); };
  let mandiCreationAttempted = false;
  prisma.mandi.findFirst = async () => null;
  prisma.mandi.create = async () => {
    mandiCreationAttempted = true;
    return { id: nextMockId++ };
  };

  try {
    const result = await require('../services/liveMarketPriceService').getLiveMarketPrices({
      cropName: 'Unregistered Live Mandi Test Crop',
      state: 'Karnataka',
    });

    assert.equal(result.prices.length, 1);
    assert.equal(result.prices[0].mandiName, 'Unregistered Live APMC');
    assert.equal(result.prices[0].modalPrice, 21);
    assert.equal(mandiCreationAttempted, false);
  } finally {
    axios.get = originalGet;
    prisma.price.findMany = originalFindMany;
    prisma.mandi.findMany = originalMandiFindMany;
    prisma.mandi.findFirst = originalMandiFindFirst;
    prisma.mandi.create = originalMandiCreate;
    if (originalApiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalApiKey;
  }
});

test('prefers a live Agmarknet quote over a saved CSV quote for the same mandi and date', async () => {
  const originalApiKey = process.env.MANDI_API_KEY;
  const originalGet = axios.get;
  const originalFindMany = prisma.price.findMany;
  const originalMandiFindMany = prisma.mandi.findMany;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  await fs.writeFile(testCsvPath, [
    'state,district,mandi_name,crop_name,variety,grade,arrival_date,price_date,min_price_rupees_per_quintal,max_price_rupees_per_quintal,modal_price_rupees_per_quintal,min_price_per_kg,max_price_per_kg,modal_price_per_kg,price_unit,source,retrieved_at_utc',
    'Karnataka,Mysuru,Mysuru APMC,Live Priority Test Crop,,,13/10/2026,2026-10-13,3000,3200,3100,30,32,31,KG,Agmarknet,2026-10-13T00:00:00.000Z',
  ].join('\n'));
  axios.get = async () => ({
    data: {
      records: [{
        state: 'Karnataka',
        district: 'Mysuru',
        market: 'Mysuru APMC',
        commodity: 'Live Priority Test Crop',
        arrival_date: '13/10/2026',
        min_price: '2000',
        max_price: '2200',
        modal_price: '2100',
      }],
    },
  });
  prisma.price.findMany = async () => [];
  prisma.mandi.findMany = async () => [{
    name: 'Mysuru APMC',
    state: 'Karnataka',
  }];

  try {
    const result = await require('../services/liveMarketPriceService').getLiveMarketPrices({
      cropName: 'Live Priority Test Crop',
      state: 'Karnataka',
    });

    assert.equal(result.prices.length, 1);
    assert.equal(result.prices[0].modalPrice, 21);
    assert.equal(result.prices[0].dataFreshness, 'live');
  } finally {
    axios.get = originalGet;
    prisma.price.findMany = originalFindMany;
    prisma.mandi.findMany = originalMandiFindMany;
    if (originalApiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalApiKey;
  }
});

test('uses a newer saved Agmarknet quote instead of an older live report', async () => {
  const originalApiKey = process.env.MANDI_API_KEY;
  const originalGet = axios.get;
  const originalFindMany = prisma.price.findMany;
  const originalMandiFindMany = prisma.mandi.findMany;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  await fs.writeFile(testCsvPath, [
    'state,district,mandi_name,crop_name,variety,grade,arrival_date,price_date,min_price_rupees_per_quintal,max_price_rupees_per_quintal,modal_price_rupees_per_quintal,min_price_per_kg,max_price_per_kg,modal_price_per_kg,price_unit,source,retrieved_at_utc',
    'Karnataka,Mysuru,Mysuru APMC,Newest Saved Price Test Crop,,,13/10/2026,2026-10-13,3000,3200,3100,30,32,31,KG,Agmarknet,2026-10-13T00:00:00.000Z',
  ].join('\n'));
  axios.get = async () => ({
    data: {
      records: [{
        state: 'Karnataka',
        district: 'Mysuru',
        market: 'Mysuru APMC',
        commodity: 'Newest Saved Price Test Crop',
        arrival_date: '12/10/2026',
        min_price: '2000',
        max_price: '2200',
        modal_price: '2100',
      }],
    },
  });
  prisma.price.findMany = async () => [];
  prisma.mandi.findMany = async () => [{
    name: 'Mysuru APMC',
    state: 'Karnataka',
  }];

  try {
    const result = await require('../services/liveMarketPriceService').getLiveMarketPrices({
      cropName: 'Newest Saved Price Test Crop',
      state: 'Karnataka',
    });

    assert.equal(result.prices.length, 1);
    assert.equal(result.prices[0].modalPrice, 31);
    assert.equal(result.prices[0].date.toISOString().slice(0, 10), '2026-10-13');
    assert.equal(result.prices[0].dataFreshness, 'cached');
  } finally {
    axios.get = originalGet;
    prisma.price.findMany = originalFindMany;
    prisma.mandi.findMany = originalMandiFindMany;
    if (originalApiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalApiKey;
  }
});

test('refreshes the CSV snapshot from state-specific Agmarknet pages', async () => {
  const originalApiKey = process.env.MANDI_API_KEY;
  const originalGet = axios.get;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  await fs.writeFile(testCsvPath, [
    'state,district,mandi_name,crop_name,variety,grade,arrival_date,price_date,min_price_rupees_per_quintal,max_price_rupees_per_quintal,modal_price_rupees_per_quintal,min_price_per_kg,max_price_per_kg,modal_price_per_kg,price_unit,source,retrieved_at_utc',
    'Karnataka,Mysuru,Mysuru,Mysuru Snapshot Test Crop,,,12/10/2026,2026-10-12,1000,1200,1100,10,12,11,KG,Agmarknet,2026-10-12T00:00:00.000Z',
    'Karnataka,Mysuru,Mysuru,Stale Saved Crop,,,11/10/2026,2026-10-11,800,1000,900,8,10,9,KG,Agmarknet,2026-10-11T00:00:00.000Z',
  ].join('\n'));
  axios.get = async (_url, { params }) => {
    if (params['filters[state.keyword]']) {
      const state = params['filters[state.keyword]'];
      return {
        data: {
          total: state === 'Karnataka' ? 2 : 1,
          records: [
            {
              state,
              district: 'New district',
              market: `${state} APMC`,
              commodity: 'Snapshot Test Crop',
              arrival_date: '13/10/2026',
              min_price: '2000',
              max_price: '2200',
              modal_price: '2100',
            },
            ...(state === 'Karnataka' ? [{
              state,
              district: 'Mysuru',
              market: 'Mysuru',
              commodity: 'Mysuru Snapshot Test Crop',
              arrival_date: '13/10/2026',
              min_price: '2000',
              max_price: '2200',
              modal_price: '2100',
            }] : []),
          ],
        },
      };
    }
    return {
      data: {
        records: [{ state: 'Karnataka' }, { state: 'Goa' }],
      },
    };
  };

  try {
    const result = await refreshAgmarknetCsv();
    const crops = await getAgmarknetCsvCrops();
    const csv = await fs.readFile(testCsvPath, 'utf8');

    assert.equal(result.states, 2);
    assert.equal(result.rows, 3);
    assert.deepEqual(crops.map((crop) => crop.name), [
      'Mysuru Snapshot Test Crop',
      'Snapshot Test Crop',
      'Stale Saved Crop',
    ]);
    assert.match(csv, /Karnataka APMC/);
    assert.match(csv, /Goa APMC/);
    assert.match(csv, /Mysuru Snapshot Test Crop/);
    const refreshedPrice = parseAgmarknetCsv(csv, {
      cropName: 'Mysuru Snapshot Test Crop',
      state: 'Karnataka',
    })[0];
    assert.equal(refreshedPrice.modalPrice, 21);
    assert.equal(refreshedPrice.date.toISOString().slice(0, 10), '2026-10-13');
    const preservedPrice = parseAgmarknetCsv(csv, {
      cropName: 'Stale Saved Crop',
      state: 'Karnataka',
    })[0];
    assert.equal(preservedPrice.modalPrice, 9);
    assert.equal(preservedPrice.date.toISOString().slice(0, 10), '2026-10-11');
  } finally {
    axios.get = originalGet;
    if (originalApiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalApiKey;
  }
});

test('recommendation and profit use CSV prices without reading Neon price or mandi values', async () => {
  const originalApiKey = process.env.MANDI_API_KEY;
  const originalGet = axios.get;
  const originalPriceFindMany = prisma.price.findMany;
  const originalMandiFindMany = prisma.mandi.findMany;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  await fs.writeFile(testCsvPath, [
    'state,district,mandi_name,crop_name,variety,grade,arrival_date,price_date,min_price_rupees_per_quintal,max_price_rupees_per_quintal,modal_price_rupees_per_quintal,min_price_per_kg,max_price_per_kg,modal_price_per_kg,price_unit,source,retrieved_at_utc',
    'Karnataka,Mysuru,Mysuru APMC,Neon Exclusion Test Crop,,,10/10/2026,2026-10-10,2000,2200,2100,20,22,21,KG,Agmarknet,2026-10-10T00:00:00.000Z',
  ].join('\n'));
  axios.get = async (url) => {
    if (url.includes('api.data.gov.in')) return { data: { records: [] } };
    if (url === 'https://nominatim.openstreetmap.org/search') {
      return { data: [{ lat: '13.0', lon: '77.7' }] };
    }
    return {
      data: {
        code: 'Ok',
        routes: [{
          distance: 1000,
          geometry: { coordinates: [[77.6, 12.9], [77.7, 13.0]] },
        }],
      },
    };
  };
  prisma.price.findMany = async () => { throw new Error('Neon prices must not be read'); };
  prisma.mandi.findMany = async () => { throw new Error('Neon mandis must not be read'); };

  try {
    const result = await recommendBestMandi({
      cropName: 'Neon Exclusion Test Crop',
      state: 'Karnataka',
    });
    assert.equal(result.recommended.mandi.name, 'Mysuru APMC');
    assert.equal(result.recommended.modalPrice, 21);
    assert.equal(result.recommended.dataFreshness, 'cached');
    const profitResult = await calculateProfit({
      cropName: 'Neon Exclusion Test Crop',
      mandiName: 'Mysuru APMC',
      state: 'Karnataka',
      quantityKg: 100,
      originLatitude: 12.9,
      originLongitude: 77.6,
    });
    assert.equal(profitResult.modalPrice, 21);
    assert.equal(profitResult.grossRevenue, 2100);
    assert.equal(profitResult.dataFreshness, 'cached');
  } finally {
    axios.get = originalGet;
    prisma.price.findMany = originalPriceFindMany;
    prisma.mandi.findMany = originalMandiFindMany;
    if (originalApiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalApiKey;
  }
});

test('ranks mandi recommendations by latest Agmarknet modal price without transport data', () => {
  const prices = [
    { mandiName: 'Bangalore', modalPrice: 30, date: new Date('2026-01-03') },
    { mandiName: 'Mysore', modalPrice: 31, date: new Date('2026-01-02') },
  ];

  const ranked = rankMarketPrices(prices);

  assert.equal(ranked[0].mandiName, 'Mysore');
  assert.equal(ranked[1].mandiName, 'Bangalore');
});

test('averages same-day reports and retains only each mandi latest date', () => {
  const latest = getLatestPricesByMarket([
    {
      cropName: 'Tomato', state: 'Karnataka', district: 'Mysuru', mandiName: 'Mysuru',
      modalPrice: 20, minPrice: 18, maxPrice: 22, date: new Date('2026-10-12'),
    },
    {
      cropName: 'Tomato', state: 'Karnataka', district: 'Mysuru', mandiName: 'Mysuru',
      modalPrice: 30, minPrice: 28, maxPrice: 32, date: new Date('2026-10-13'),
    },
    {
      cropName: 'Tomato', state: 'Karnataka', district: 'Mysuru', mandiName: 'Mysuru',
      modalPrice: 40, minPrice: 38, maxPrice: 42, date: new Date('2026-10-13'),
    },
  ]);

  assert.equal(latest.length, 1);
  assert.equal(latest[0].modalPrice, 35);
  assert.equal(latest[0].minPrice, 33);
  assert.equal(latest[0].maxPrice, 37);
  assert.equal(latest[0].date.toISOString().slice(0, 10), '2026-10-13');
});

test('generates a mandi recommendation from MANDI_API_KEY data without transport settings', async () => {
  const originalApiKey = process.env.MANDI_API_KEY;
  const originalMapsKey = process.env.GOOGLE_MAPS_API_KEY;
  const originalGet = axios.get;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  delete process.env.TRANSPORT_RATE_PER_KM;
  delete process.env.GOOGLE_MAPS_API_KEY;
  axios.get = async (_url, { params }) => {
    assert.equal(params['filters[state.keyword]'], 'Karnataka');
    assert.equal(params['filters[commodity.keyword]'], 'Agmarknet Test Crop');
    return {
      data: {
        records: [
          { commodity: 'Agmarknet Test Crop', state: 'Karnataka', district: 'Bengaluru', market: 'Bangalore', arrival_date: '03/01/2026', modal_price: '3000' },
          { commodity: 'Agmarknet Test Crop', state: 'Karnataka', district: 'Mysuru', market: 'Mysore', arrival_date: '02/01/2026', modal_price: '3200' },
          { commodity: 'Agmarknet Test Crop', state: 'Karnataka', district: 'Kolar', market: 'Kolar', arrival_date: '02/01/2026', modal_price: '3100' },
          { commodity: 'Agmarknet Test Crop', state: 'Karnataka', district: 'Dharwad', market: 'Hubballi', arrival_date: '02/01/2026', modal_price: '2900' },
          { commodity: 'Agmarknet Test Crop', state: 'Karnataka', district: 'Tumakuru', market: 'Tumakuru', arrival_date: '02/01/2026', modal_price: '2800' },
          { commodity: 'Agmarknet Test Crop', state: 'Karnataka', district: 'Belagavi', market: 'Belagavi', arrival_date: '02/01/2026', modal_price: '2700' },
        ],
      },
    };
  };

  try {
    const result = await recommendBestMandi({ cropName: 'Agmarknet Test Crop', state: 'Karnataka' });

    assert.equal(result.dataSource, 'Agmarknet');
    assert.equal(result.recommended.mandi.name, 'Mysore');
    assert.equal(result.recommended.modalPrice, 32);
    assert.equal(result.allOptions.length, 6);
    assert.equal(result.marketScope, 'state');
    assert.match(result.reason, /does not include transportation costs/);
  } finally {
    axios.get = originalGet;
    if (originalApiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalApiKey;
    if (originalMapsKey === undefined) delete process.env.GOOGLE_MAPS_API_KEY;
    else process.env.GOOGLE_MAPS_API_KEY = originalMapsKey;
  }
});

test('prefers a price-reporting mandi in the detected district', async () => {
  const originalApiKey = process.env.MANDI_API_KEY;
  const originalGet = axios.get;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  axios.get = async () => ({
    data: {
      records: [
        { commodity: 'Tomato', state: 'Karnataka', district: 'Mysuru', market: 'Mysuru APMC', arrival_date: '13/10/2026', modal_price: '5000' },
        { commodity: 'Tomato', state: 'Karnataka', district: 'Bagalkot', market: 'Hungund APMC', arrival_date: '13/10/2026', modal_price: '6000' },
      ],
    },
  });

  try {
    const result = await recommendBestMandi({
      cropName: 'Tomato',
      state: 'Karnataka',
      district: 'Mysuru',
    });

    assert.equal(result.recommended.mandi.district, 'Mysuru');
    assert.match(result.reason, /your district, Mysuru/);
  } finally {
    axios.get = originalGet;
    if (originalApiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalApiKey;
  }
});

test('ranks location-aware mandi options by estimated net profit after transport', async () => {
  const originalApiKey = process.env.MANDI_API_KEY;
  const originalGet = axios.get;
  const originalMandiFindMany = prisma.mandi.findMany;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  prisma.mandi.findMany = async () => [
    { id: 1, name: 'Near APMC', state: 'Karnataka', district: 'Near' },
    { id: 2, name: 'Far APMC', state: 'Karnataka', district: 'Far' },
  ];
  axios.get = async (url, { params } = {}) => {
    if (url.includes('api.data.gov.in')) {
      return {
        data: {
          records: [
            { commodity: 'Tomato', state: 'Karnataka', district: 'Near', market: 'Near APMC', arrival_date: '13/10/2026', min_price: '4500', max_price: '5500', modal_price: '5000' },
            { commodity: 'Tomato', state: 'Karnataka', district: 'Far', market: 'Far APMC', arrival_date: '13/10/2026', min_price: '5500', max_price: '6500', modal_price: '6000' },
          ],
        },
      };
    }
    if (url === 'https://nominatim.openstreetmap.org/search') {
      return {
        data: [{
          lat: params.q.includes('Near') ? '13.0' : '15.0',
          lon: params.q.includes('Near') ? '77.6' : '75.0',
        }],
      };
    }
    return {
      data: {
        code: 'Ok',
        routes: [{
          distance: url.includes('77.6,13') ? 10000 : 300000,
          geometry: { coordinates: [[77.5, 12.9], [77.6, 13.0]] },
        }],
      },
    };
  };

  try {
    const result = await recommendBestMandi({
      cropName: 'Tomato',
      state: 'Karnataka',
      originLatitude: 12.9,
      originLongitude: 77.5,
      quantityKg: 100,
    });

    assert.equal(result.recommended.mandi.name, 'Near APMC');
    assert.equal(result.recommended.estimatedNetProfit, 4930);
    assert.equal(result.recommended.distanceKm, 10);
    assert.equal(result.allOptions[1].estimatedNetProfit, 3900);
  } finally {
    axios.get = originalGet;
    prisma.mandi.findMany = originalMandiFindMany;
    if (originalApiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalApiKey;
  }
});

test('loads every price-history page before predicting mandi prices', async () => {
  const originalApiKey = process.env.MANDI_API_KEY;
  const originalGet = axios.get;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  const offsets = [];
  axios.get = async (_url, { params }) => {
    offsets.push(params.offset);
    const records = params.offset === 0
      ? [
        { market: 'Bangalore', arrival_date: '03/01/2026', modal_price: '1000' },
        ...Array.from({ length: 999 }, () => ({
          market: 'Other market',
          arrival_date: '03/01/2026',
          modal_price: '1000',
        })),
      ]
      : [{ market: 'Bangalore', arrival_date: '04/01/2026', modal_price: '1200' }];
    return { data: { total: 1001, records } };
  };

  try {
    const result = await predictTwoDayPrices({
      cropName: 'Tomato',
      state: 'Karnataka',
      mandiNames: ['Bangalore'],
      targetDate: '2026-01-05',
    });

    assert.deepEqual(offsets, [0, 1000]);
    assert.equal(result.predictions[0].sampleCount, 2);
    assert.equal(result.predictions[0].predictedPrice, 14);
  } finally {
    axios.get = originalGet;
    if (originalApiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalApiKey;
  }
});

test('does not recommend a mandi from another state when local Agmarknet prices are missing', async () => {
  const originalApiKey = process.env.MANDI_API_KEY;
  const originalGet = axios.get;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  const requests = [];
  axios.get = async (_url, { params }) => {
    requests.push(params);
    return {
      data: {
        records: params['filters[state.keyword]']
          ? []
          : [
            { commodity: 'No Karnataka Cache Test Crop', state: 'West Bengal', district: 'Bankura', market: 'Bishnupur APMC', arrival_date: '13/10/2026', modal_price: '10700' },
            { commodity: 'No Karnataka Cache Test Crop', state: 'West Bengal', district: 'Darjeeling', market: 'Siliguri APMC', arrival_date: '13/10/2026', modal_price: '12500' },
          ],
      },
    };
  };

  try {
    const recommendation = await recommendBestMandi({
      cropName: 'No Karnataka Cache Test Crop',
      state: 'Karnataka',
    });

    assert.equal(requests.length, 1);
    assert.equal(requests[0]['filters[state.keyword]'], 'Karnataka');
    assert.equal(recommendation.marketScope, 'state');
    assert.equal(recommendation.recommended, null);
    assert.deepEqual(recommendation.allOptions, []);
    assert.match(recommendation.reason, /in Karnataka/);
  } finally {
    axios.get = originalGet;
    if (originalApiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalApiKey;
  }
});

test('does not return other-state records in Karnataka market comparison', async () => {
  const originalApiKey = process.env.MANDI_API_KEY;
  const originalGet = axios.get;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  await fs.writeFile(testCsvPath, [
    'state,district,mandi_name,crop_name,variety,grade,arrival_date,price_date,min_price_rupees_per_quintal,max_price_rupees_per_quintal,modal_price_rupees_per_quintal,min_price_per_kg,max_price_per_kg,modal_price_per_kg,price_unit,source,retrieved_at_utc',
  ].join('\n'));
  axios.get = async (_url, { params }) => {
    assert.equal(params['filters[state.keyword]'], 'Karnataka');
    return {
      data: {
        records: [
          { commodity: 'No Karnataka Cache Test Crop', state: 'West Bengal', district: 'Darjeeling', market: 'Siliguri APMC', arrival_date: '13/10/2026', min_price: '12300', max_price: '12700', modal_price: '12500' },
        ],
      },
    };
  };

  try {
    const response = {
      status: (status) => ({ json: (body) => ({ status, body }) }),
      json(body) { this.body = body; },
    };
    await priceController.getLivePrices({
      query: { state: 'Karnataka', commodity: 'No Karnataka Cache Test Crop' },
    }, response);

    assert.equal(response.body.marketScope, 'state');
    assert.equal(response.body.pricedCount, 0);
    assert.equal(response.body.count, 0);
    assert.deepEqual(response.body.records, []);
  } finally {
    axios.get = originalGet;
    if (originalApiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalApiKey;
  }
});

test('includes CSV mandi directory and live prices without reading Neon mandis', async () => {
  const originalApiKey = process.env.MANDI_API_KEY;
  const originalGet = axios.get;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  await fs.writeFile(testCsvPath, [
    'state,district,mandi_name,crop_name,variety,grade,arrival_date,price_date,min_price_rupees_per_quintal,max_price_rupees_per_quintal,modal_price_rupees_per_quintal,min_price_per_kg,max_price_per_kg,modal_price_per_kg,price_unit,source,retrieved_at_utc',
    'Karnataka,Mysuru,Mysuru Mandi,Other Directory Crop,,,13/10/2026,2026-10-13,2500,2600,2550,25,26,25.5,KG,Agmarknet,2026-10-13T00:00:00.000Z',
    'Karnataka,Kolar,Kolar Mandi,Other Directory Crop,,,13/10/2026,2026-10-13,2500,2600,2550,25,26,25.5,KG,Agmarknet,2026-10-13T00:00:00.000Z',
  ].join('\n'));
  prisma.mandi.findMany = async () => { throw new Error('Neon mandi directory must not be read'); };
  axios.get = async () => ({
    data: {
      records: [
        { commodity: 'Test Market Controller Crop', state: 'Karnataka', district: 'Bagalkot', market: 'Hungund APMC', arrival_date: '13/10/2026', min_price: '2500', max_price: '2600', modal_price: '2550' },
      ],
    },
  });

  try {
    const response = {
      status: (status) => ({ json: (body) => ({ status, body }) }),
      json(body) { this.body = body; },
    };
    await priceController.getLivePrices({
      query: { state: 'Karnataka', commodity: 'Test Market Controller Crop' },
    }, response);

    assert.equal(response.body.pricedCount, 1);
    assert.equal(response.body.records.length, 3);
    assert.equal(response.body.records.filter((record) => record.hasLivePrice).length, 1);
    assert.equal(response.body.records.find((record) => record.mandi.name === 'Mysuru Mandi').modalPrice, null);
    assert.equal(response.body.records.find((record) => record.mandi.name === 'Kolar Mandi').hasLivePrice, false);
    assert.equal(response.body.records.find((record) => record.mandi.name === 'Hungund APMC').modalPrice, 25.5);
  } finally {
    axios.get = originalGet;
    if (originalApiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalApiKey;
  }
});

test('filters out records from another state even if returned by the live API', async () => {
  const originalApiKey = process.env.MANDI_API_KEY;
  const originalGet = axios.get;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  axios.get = async () => ({
    data: {
      records: [
        { commodity: 'Profit Calculator Test Crop', state: 'West Bengal', district: 'Darjeeling', market: 'Siliguri APMC', arrival_date: '13/10/2026', min_price: '12300', max_price: '12700', modal_price: '12500' },
      ],
    },
  });

  try {
    const { getLiveMarketPrices } = require('../services/liveMarketPriceService');
    const result = await getLiveMarketPrices({ cropName: 'Profit Calculator Test Crop', state: 'Karnataka' });
    assert.deepEqual(result, { prices: [], marketScope: 'state' });
  } finally {
    axios.get = originalGet;
    if (originalApiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalApiKey;
  }
});

test('calculates profit using a selected live mandi price and its state', async () => {
  const originalApiKey = process.env.MANDI_API_KEY;
  const originalGet = axios.get;
  const originalMandiFindMany = prisma.mandi.findMany;
  process.env.MANDI_API_KEY = 'test-mandi-key';
  prisma.mandi.findMany = async () => [{
    id: 1,
    name: 'Siliguri APMC',
    state: 'West Bengal',
    district: 'Darjeeling',
  }];
  axios.get = async (url, { params } = {}) => {
    if (url.includes('api.data.gov.in')) {
      assert.equal(params['filters[state.keyword]'], 'West Bengal');
      return {
        data: {
          records: [
            { commodity: 'Profit Calculator Test Crop', state: 'West Bengal', district: 'Darjeeling', market: 'Siliguri APMC', arrival_date: '13/10/2026', min_price: '12300', max_price: '12700', modal_price: '12500' },
          ],
        },
      };
    }
    if (url === 'https://nominatim.openstreetmap.org/search') {
      return { data: [{ lat: '26.7271', lon: '88.3953' }] };
    }
    return {
      data: {
        code: 'Ok',
        routes: [{
          distance: 1000,
          geometry: { coordinates: [[77.6, 12.9], [88.3953, 26.7271]] },
        }],
      },
    };
  };

  try {
    const result = await calculateProfit({
      cropName: 'Profit Calculator Test Crop',
      mandiName: 'Siliguri APMC',
      state: 'West Bengal',
      quantityKg: 100,
      originLatitude: 12.9,
      originLongitude: 77.6,
    });

    assert.equal(result.modalPrice, 125);
    assert.equal(result.grossRevenue, 12500);
    assert.equal(result.distanceKm, 1);
    assert.equal(result.transportCost, 7);
    assert.equal(result.netProfit, 12493);
  } finally {
    axios.get = originalGet;
    prisma.mandi.findMany = originalMandiFindMany;
    if (originalApiKey === undefined) delete process.env.MANDI_API_KEY;
    else process.env.MANDI_API_KEY = originalApiKey;
  }
});

test('estimates road transportation with OSRM at the backend fixed per-kilometre rate', async () => {
  const originalGet = axios.get;
  const requests = [];
  axios.get = async (url, options) => {
    requests.push({ url, options });
    if (url === 'https://nominatim.openstreetmap.org/search') {
      assert.equal(options.params.q, 'Yeshwanthpur APMC Market, Bengaluru, Karnataka, India');
      assert.equal(options.params.countrycodes, 'in');
      assert.equal(options.params.format, 'jsonv2');
      assert.equal(options.params.limit, 1);
      assert.equal(options.headers['User-Agent'], 'SmartRaitha/1.0');
      return { data: [{ lat: '13.0', lon: '77.7' }] };
    }

    assert.equal(url, 'https://router.project-osrm.org/route/v1/driving/77.6,12.9;77.7,13');
    assert.deepEqual(options.params, {
      overview: 'full',
      geometries: 'geojson',
      steps: false,
    });
    return {
      data: {
        code: 'Ok',
        routes: [{
          distance: 12500,
          geometry: {
            coordinates: [[77.6, 12.9], [77.7, 13.0]],
          },
        }],
      },
    };
  };

  try {
    const estimate = await estimateTransportation({
      originLatitude: 12.9,
      originLongitude: 77.6,
      destination: 'Bangalore, Karnataka, India',
    });

    assert.deepEqual(estimate, {
      distanceKm: 12.5,
      ratePerKm: 7,
      transportationCost: 87.5,
      routeCoordinates: [
        { latitude: 12.9, longitude: 77.6 },
        { latitude: 13, longitude: 77.7 },
      ],
      originCoordinates: { latitude: 12.9, longitude: 77.6 },
      destinationCoordinates: { latitude: 13.0, longitude: 77.7 },
    });
    assert.equal(estimate.ratePerKm, TRANSPORT_RATE_PER_KM);
    assert.equal(requests.length, 2);
    assert.deepEqual(estimate.originCoordinates, { latitude: 12.9, longitude: 77.6 });
    assert.deepEqual(estimate.destinationCoordinates, { latitude: 13.0, longitude: 77.7 });
  } finally {
    axios.get = originalGet;
  }
});

test('reports when OSRM cannot find a driving route', async () => {
  const originalGet = axios.get;
  axios.get = async (url) => (url === 'https://nominatim.openstreetmap.org/search'
    ? { data: [{ lat: '13.0', lon: '77.7' }] }
    : { data: { code: 'NoRoute', routes: [] } });

  try {
    await assert.rejects(
      estimateTransportation({
        originLatitude: 12.9,
        originLongitude: 77.6,
        destination: 'Bangalore, Karnataka, India',
      }),
      /OSRM could not find a driving route/,
    );
  } finally {
    axios.get = originalGet;
  }
});

test('finds locations for common Karnataka APMC aliases', async () => {
  const originalGet = axios.get;
  const cases = [
    {
      destination: 'Bengaluru APMC, Karnataka, India',
      geocodeQuery: 'Yeshwanthpur APMC Market, Bengaluru, Karnataka, India',
      latitude: 13.0159579,
      longitude: 77.5451162,
    },
    {
      destination: 'Ballari APMC, Karnataka, India',
      geocodeQuery: 'APMC Road, Ballari, Karnataka, India',
      latitude: 15.1272686,
      longitude: 76.9199053,
    },
    {
      destination: 'Laxmeshwar APMC, Karnataka, India',
      geocodeQuery: 'Lakshmeshwar, Karnataka, India',
      latitude: 15.12373,
      longitude: 75.4741167,
    },
  ];

  try {
    for (const location of cases) {
      axios.get = async (url, { params }) => {
        if (url === 'https://nominatim.openstreetmap.org/search') {
          assert.equal(params.q, location.geocodeQuery);
          assert.equal(params.countrycodes, 'in');
          return {
            data: [{
              lat: String(location.latitude),
              lon: String(location.longitude),
            }],
          };
        }

        return {
          data: {
            code: 'Ok',
            routes: [{
              distance: 1000,
              geometry: {
                coordinates: [
                  [77.6, 12.9],
                  [location.longitude, location.latitude],
                ],
              },
            }],
          },
        };
      };

      const estimate = await estimateTransportation({
        originLatitude: 12.9,
        originLongitude: 77.6,
        destination: location.destination,
      });

      assert.deepEqual(estimate.destinationCoordinates, {
        latitude: location.latitude,
        longitude: location.longitude,
      });
    }
  } finally {
    axios.get = originalGet;
  }
});

test('forecasts two days ahead from the recent Agmarknet price trend', () => {
  const records = [
    { market: 'Bangalore', arrival_date: '01/01/2026', modal_price: '1000' },
    { market: 'Bangalore', arrival_date: '02/01/2026', modal_price: '1200' },
    { market: 'Bangalore', arrival_date: '03/01/2026', modal_price: '1400' },
  ];

  const [forecast] = buildTwoDayForecast(records, {
    mandiNames: ['Bangalore Mandi'],
    targetDate: '2026-01-05',
  });

  assert.equal(forecast.predictedDate, '2026-01-05');
  assert.equal(forecast.predictedPrice, 18);
  assert.equal(forecast.sampleCount, 3);
});
