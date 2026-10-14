const fs = require('node:fs/promises');
const path = require('node:path');
const {
  fetchAgmarknetPage,
  fetchAllAgmarknetRecords,
  normalizeRecord,
} = require('./importService');
const { normalizeMandiName } = require('./marketUtils');
const { getMandiCoordinates } = require('./mandiCoordinateService');
const {
  normalizeCropName,
  selectSellingCrops,
} = require('./sellingCropService');

const DAY_MS = 24 * 60 * 60 * 1000;
const AGMARKNET_CSV_PATH = process.env.AGMARKNET_CSV_PATH
  || path.join(__dirname, '..', 'data', 'agmarknet_current_prices.csv');
const KARNATAKA_SELLING_CSV_PATH = process.env.AGMARKNET_KARNATAKA_CSV_PATH
  || path.join(__dirname, '..', 'data', 'agmarknet_karnataka_updated_prices.csv');
const AGMARKNET_CSV_HEADERS = [
  'state',
  'district',
  'mandi_name',
  'crop_name',
  'variety',
  'grade',
  'arrival_date',
  'price_date',
  'min_price_rupees_per_quintal',
  'max_price_rupees_per_quintal',
  'modal_price_rupees_per_quintal',
  'min_price_per_kg',
  'max_price_per_kg',
  'modal_price_per_kg',
  'price_unit',
  'source',
  'retrieved_at_utc',
];
const KARNATAKA_SELLING_CSV_HEADERS = [
  ...AGMARKNET_CSV_HEADERS,
  'quote_status',
  'snapshot_generated_at_utc',
];
const MAX_CSV_REFRESH_INTERVAL_MS = DAY_MS;
let csvWriteQueue = Promise.resolve();
let csvRefreshPromise = null;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function parseCsvRow(line) {
  const fields = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      field += '"';
      index++;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      fields.push(field);
      field = '';
    } else {
      field += character;
    }
  }
  fields.push(field);
  return fields;
}

function parseCsvObjects(csvText) {
  const [headerLine, ...lines] = csvText.split(/\r?\n/).filter(Boolean);
  if (!headerLine) return [];

  const headers = parseCsvRow(headerLine);
  return lines.map((line) => {
    const values = parseCsvRow(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
}

function serializeCsvValue(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function makeCsvRow(rawRecord, retrievedAt) {
  const normalized = normalizeRecord(rawRecord);
  const pricePerKg = (rawValue, normalizedValue) => {
    if (rawValue != null && String(rawValue).trim() !== '') return Number.parseFloat(rawValue);
    return normalizedValue == null ? '' : normalizedValue * 100;
  };
  return {
    state: normalized.state,
    district: normalized.district || '',
    mandi_name: normalized.mandiName,
    crop_name: normalized.cropName,
    variety: rawRecord.variety || '',
    grade: rawRecord.grade || '',
    arrival_date: normalized.arrivalDate,
    price_date: normalized.date ? normalized.date.toISOString().slice(0, 10) : '',
    min_price_rupees_per_quintal: pricePerKg(rawRecord.min_price, normalized.minPrice),
    max_price_rupees_per_quintal: pricePerKg(rawRecord.max_price, normalized.maxPrice),
    modal_price_rupees_per_quintal: pricePerKg(rawRecord.modal_price, normalized.modalPrice),
    min_price_per_kg: normalized.minPrice ?? '',
    max_price_per_kg: normalized.maxPrice ?? '',
    modal_price_per_kg: normalized.modalPrice ?? '',
    price_unit: 'KG',
    source: 'Agmarknet',
    retrieved_at_utc: retrievedAt,
  };
}

async function readAgmarknetCsvRows() {
  try {
    const csvText = await fs.readFile(AGMARKNET_CSV_PATH, 'utf8');
    return parseCsvObjects(csvText);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function enqueueCsvWrite(operation) {
  const nextWrite = csvWriteQueue.then(operation);
  csvWriteQueue = nextWrite.catch(() => {});
  return nextWrite;
}

async function writeAgmarknetCsvRows(rows) {
  const csvText = [
    AGMARKNET_CSV_HEADERS.join(','),
    ...rows.map((row) => AGMARKNET_CSV_HEADERS
      .map((header) => serializeCsvValue(row[header]))
      .join(',')),
    '',
  ].join('\n');
  await fs.mkdir(path.dirname(AGMARKNET_CSV_PATH), { recursive: true });
  const tempPath = `${AGMARKNET_CSV_PATH}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, csvText, 'utf8');
  await fs.rename(tempPath, AGMARKNET_CSV_PATH);
}

async function writeKarnatakaSellingPriceSnapshot() {
  const csvText = await fs.readFile(AGMARKNET_CSV_PATH, 'utf8');
  const sourceRows = parseCsvObjects(csvText);
  const crops = selectSellingCrops(await getAgmarknetCsvCrops({ state: 'Karnataka' }));
  const mandis = await getAgmarknetCsvMandis({ state: 'Karnataka' });
  if (crops.length === 0 || mandis.length === 0) {
    throw new Error('Cannot create the Karnataka selling-price grid without saved crops and mandis.');
  }

  const pricesByPair = new Map();
  const sourceRetrievedAtByPair = new Map();
  sourceRows.forEach((row) => {
    if (
      String(row.state || '').trim().toLocaleLowerCase() !== 'karnataka'
      || String(row.source || '').trim() !== 'Agmarknet'
      || !String(row.price_date || '').trim()
      || !Number.isFinite(Number(row.modal_price_per_kg))
      || Number(row.modal_price_per_kg) <= 0
    ) {
      return;
    }
    const key = [
      normalizeCropName(row.crop_name),
      normalizeMandiName(row.mandi_name),
    ].join('|');
    const current = sourceRetrievedAtByPair.get(key);
    if (!current
      || String(row.price_date) > current.priceDate
      || (String(row.price_date) === current.priceDate
        && Date.parse(row.retrieved_at_utc || '') > Date.parse(current.retrievedAt || ''))) {
      sourceRetrievedAtByPair.set(key, {
        priceDate: String(row.price_date),
        retrievedAt: String(row.retrieved_at_utc || ''),
      });
    }
  });
  for (const crop of crops) {
    const latestByMarket = getLatestPricesByMarket(parseAgmarknetCsv(csvText, {
      cropName: crop.name,
      state: 'Karnataka',
    }));
    for (const price of latestByMarket) {
      const key = [
        normalizeCropName(price.cropName),
        normalizeMandiName(price.mandiName),
      ].join('|');
      pricesByPair.set(key, price);
    }
  }

  const retrievedAt = new Date().toISOString();
  const rows = [];
  for (const mandi of mandis) {
    for (const crop of crops) {
      const key = [
        normalizeCropName(crop.name),
        normalizeMandiName(mandi.name),
      ].join('|');
      const price = pricesByPair.get(key);
      rows.push({
        state: 'Karnataka',
        district: price?.district || mandi.district || '',
        mandi_name: mandi.name,
        crop_name: crop.name,
        variety: '',
        grade: '',
        arrival_date: price?.date.toISOString().slice(0, 10) || '',
        price_date: price?.date.toISOString().slice(0, 10) || '',
        min_price_rupees_per_quintal: price ? price.minPrice * 100 : '',
        max_price_rupees_per_quintal: price ? price.maxPrice * 100 : '',
        modal_price_rupees_per_quintal: price ? price.modalPrice * 100 : '',
        min_price_per_kg: price?.minPrice ?? '',
        max_price_per_kg: price?.maxPrice ?? '',
        modal_price_per_kg: price?.modalPrice ?? '',
        price_unit: 'KG',
        source: price ? 'Agmarknet' : '',
        retrieved_at_utc: price
          ? sourceRetrievedAtByPair.get(key)?.retrievedAt || ''
          : '',
        quote_status: price ? 'reported' : 'not_reported',
        snapshot_generated_at_utc: retrievedAt,
      });
    }
  }

  const snapshot = [
    KARNATAKA_SELLING_CSV_HEADERS.join(','),
    ...rows.map((row) => KARNATAKA_SELLING_CSV_HEADERS
      .map((header) => serializeCsvValue(row[header]))
      .join(',')),
    '',
  ].join('\n');
  await fs.mkdir(path.dirname(KARNATAKA_SELLING_CSV_PATH), { recursive: true });
  const tempPath = `${KARNATAKA_SELLING_CSV_PATH}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, snapshot, 'utf8');
  await fs.rename(tempPath, KARNATAKA_SELLING_CSV_PATH);

  return {
    crops: crops.length,
    mandis: mandis.length,
    rows: rows.length,
    reportedPrices: rows.filter((row) => row.quote_status === 'reported').length,
  };
}

function csvRecordKey(row) {
  return [
    String(row.state || '').trim().toLocaleLowerCase(),
    String(row.district || '').trim().toLocaleLowerCase(),
    normalizeMandiName(row.mandi_name),
    normalizeCropName(row.crop_name),
    String(row.variety || '').trim().toLocaleLowerCase(),
    String(row.grade || '').trim().toLocaleLowerCase(),
    String(row.price_date || '').trim(),
  ].join('|');
}

async function updateAgmarknetCsv(rawRecords) {
  if (rawRecords.length === 0) return;
  const retrievedAt = new Date().toISOString();
  const updates = rawRecords.map((record) => makeCsvRow(record, retrievedAt));

  return enqueueCsvWrite(async () => {
    const rows = await readAgmarknetCsvRows();
    const rowsByKey = new Map(rows.map((row) => [csvRecordKey(row), row]));
    for (const row of updates) {
      const key = csvRecordKey(row);
      const existing = rowsByKey.get(key);
      const existingDate = existing?.price_date || '';
      if (!existing || row.price_date >= existingDate) {
        rowsByKey.set(key, row);
      }
    }
    await writeAgmarknetCsvRows([...rowsByKey.values()]);
  });
}

async function getAgmarknetCsvCrops({ state } = {}) {
  const rows = await readAgmarknetCsvRows();
  const names = new Map();
  rows.forEach((row) => {
    const cropName = String(row.crop_name || '').trim();
    const rowState = String(row.state || '').trim();
    if (
      cropName
      && (!state || rowState.toLocaleLowerCase() === state.trim().toLocaleLowerCase())
    ) {
      const key = cropName.toLocaleLowerCase();
      if (!names.has(key)) {
        names.set(key, {
          id: cropName,
          name: cropName,
          markets: new Set(),
          latestPriceDate: '',
        });
      }
      const crop = names.get(key);
      crop.markets.add([
        rowState.toLocaleLowerCase(),
        String(row.district || '').trim().toLocaleLowerCase(),
        normalizeMandiName(row.mandi_name),
      ].join('|'));
      const priceDate = String(row.price_date || '').trim();
      if (priceDate > crop.latestPriceDate) crop.latestPriceDate = priceDate;
    }
  });
  return [...names.values()]
    .map(({ markets, ...crop }) => ({
      ...crop,
      marketCount: markets.size,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function getAgmarknetCsvMandis({ state } = {}) {
  const rows = await readAgmarknetCsvRows();
  const mandis = new Map();
  rows.forEach((row) => {
    const name = String(row.mandi_name || '').trim();
    const rowState = String(row.state || '').trim();
    const district = String(row.district || '').trim();
    if (
      !name
      || !rowState
      || (state && rowState.toLocaleLowerCase() !== state.trim().toLocaleLowerCase())
    ) {
      return;
    }
    const key = [rowState.toLocaleLowerCase(), normalizeMandiName(name)].join('|');
    const current = mandis.get(key);
    if (!current || (!current.district && district)) {
      const coordinates = getMandiCoordinates(name, rowState);
      mandis.set(key, {
        id: key,
        name,
        district: district || null,
        state: rowState,
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
        coordinatePrecision: coordinates?.coordinatePrecision ?? null,
      });
    }
  });
  return [...mandis.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function refreshAgmarknetCsv() {
  if (csvRefreshPromise) return csvRefreshPromise;

  csvRefreshPromise = (async () => {
    const refreshStartedAt = new Date().toISOString();
    const existingRows = await readAgmarknetCsvRows();
    const stateNames = new Set(existingRows.map((row) => String(row.state || '').trim()).filter(Boolean));
    const nationalPage = await fetchAgmarknetPage({ limit: 1000, offset: 0 });
    nationalPage.forEach((record) => {
      const state = String(record.state || '').trim();
      if (state) stateNames.add(state);
    });
    if (stateNames.size === 0) {
      throw new Error('Agmarknet refresh returned no states; existing CSV was left unchanged.');
    }

    const states = [...stateNames];
    const recordsByState = new Map();
    let nextStateIndex = 0;
    async function fetchStatePages() {
      while (nextStateIndex < states.length) {
        const state = states[nextStateIndex];
        nextStateIndex++;
        let lastError;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const records = await fetchAllAgmarknetRecords({
              filters: { 'state.keyword': state },
            });
            recordsByState.set(state, records.filter((record) => (
              String(record.state || '').trim().toLocaleLowerCase() === state.toLocaleLowerCase()
            )));
            lastError = null;
            break;
          } catch (error) {
            lastError = error;
            await delay(500 * (attempt + 1));
          }
        }
        if (lastError) {
          throw new Error(`Could not refresh Agmarknet prices for ${state}: ${lastError.message}`);
        }
        await delay(250);
      }
    }
    await Promise.all([fetchStatePages(), fetchStatePages()]);

    const retrievedAt = refreshStartedAt;
    const rows = states.flatMap((state) => recordsByState.get(state) || [])
      .map((record) => makeCsvRow(record, retrievedAt));
    if (rows.length === 0) {
      throw new Error('Agmarknet refresh returned no price records; existing CSV was left unchanged.');
    }

    await enqueueCsvWrite(async () => {
      const fetchedRowsByKey = new Map(rows.map((row) => [csvRecordKey(row), row]));
      const currentRows = await readAgmarknetCsvRows();
      currentRows.forEach((current) => {
        const key = csvRecordKey(current);
        const refreshed = fetchedRowsByKey.get(key);
        if (
          !refreshed
          || current.price_date > refreshed.price_date
          || (current.price_date === refreshed.price_date
            && Date.parse(current.retrieved_at_utc) > Date.parse(refreshed.retrieved_at_utc || ''))
        ) {
          fetchedRowsByKey.set(key, current);
        }
      });
      await writeAgmarknetCsvRows([...fetchedRowsByKey.values()]);
    });
    const karnatakaSnapshot = await writeKarnatakaSellingPriceSnapshot();
    return {
      rows: rows.length,
      states: states.length,
      refreshedAt: retrievedAt,
      karnatakaSnapshot,
    };
  })();

  try {
    return await csvRefreshPromise;
  } finally {
    csvRefreshPromise = null;
  }
}

function startAgmarknetCsvRefreshScheduler() {
  const refresh = async () => {
    try {
      const result = await refreshAgmarknetCsv();
      console.info(
        `Agmarknet CSV refreshed: ${result.rows} price records across ${result.states} states.`,
      );
      console.info(
        `Karnataka selling CSV refreshed: ${result.karnatakaSnapshot.reportedPrices} reported crop prices across ${result.karnatakaSnapshot.crops} crops and ${result.karnatakaSnapshot.mandis} mandis; other combinations marked not_reported.`,
      );
    } catch (error) {
      console.error('Agmarknet CSV refresh failed; keeping the previous snapshot:', error.message);
    }
  };

  void refresh();
  return setInterval(refresh, MAX_CSV_REFRESH_INTERVAL_MS);
}

function parseAgmarknetCsv(csvText, { cropName, state, now = Date.now() }) {
  const [headerLine, ...lines] = csvText.split(/\r?\n/).filter(Boolean);
  if (!headerLine) return [];

  const headers = parseCsvRow(headerLine);
  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));
  const requiredHeaders = [
    'state', 'district', 'mandi_name', 'crop_name', 'price_date',
    'min_price_per_kg', 'max_price_per_kg', 'modal_price_per_kg',
    'price_unit', 'source',
  ];
  if (requiredHeaders.some((header) => indexes[header] === undefined)) return [];

  return lines.flatMap((line) => {
    const fields = parseCsvRow(line);
    const value = (header) => fields[indexes[header]] || '';
    const recordCrop = value('crop_name').trim();
    const recordState = value('state').trim();
    const priceDate = value('price_date').trim();
    const date = /^\d{4}-\d{2}-\d{2}$/.test(priceDate)
      ? new Date(`${priceDate}T00:00:00.000Z`)
      : new Date(Number.NaN);
    const minRaw = value('min_price_per_kg').trim();
    const maxRaw = value('max_price_per_kg').trim();
    const modalRaw = value('modal_price_per_kg').trim();
    const minPrice = Number(minRaw);
    const maxPrice = Number(maxRaw);
    const modalPrice = Number(modalRaw);

    if (
      normalizeCropName(recordCrop) !== normalizeCropName(cropName)
      || recordState.toLocaleLowerCase() !== state.trim().toLocaleLowerCase()
      || !value('mandi_name').trim()
      || value('source') !== 'Agmarknet'
      || value('price_unit') !== 'KG'
      || Number.isNaN(date.getTime())
      || date.toISOString().slice(0, 10) !== priceDate
      || !minRaw
      || !maxRaw
      || !modalRaw
      || !Number.isFinite(minPrice)
      || !Number.isFinite(maxPrice)
      || !Number.isFinite(modalPrice)
      || modalPrice <= 0
    ) {
      return [];
    }

    const ageDays = Math.max(0, Math.floor((now - date.getTime()) / DAY_MS));
    return [{
      cropName: recordCrop,
      mandiName: value('mandi_name').trim(),
      state: recordState,
      district: value('district').trim() || null,
      minPrice,
      maxPrice,
      modalPrice,
      priceUnit: 'KG',
      date,
      arrivalDate: value('price_date').trim(),
      dataFreshness: 'cached',
      ageDays,
      source: 'Agmarknet',
    }];
  });
}

async function getCsvCachedPrices({ cropName, state }) {
  const sources = [{ path: AGMARKNET_CSV_PATH, priority: 0 }];
  if (state.trim().toLocaleLowerCase() === 'karnataka'
    && path.resolve(KARNATAKA_SELLING_CSV_PATH) !== path.resolve(AGMARKNET_CSV_PATH)) {
    sources.unshift({ path: KARNATAKA_SELLING_CSV_PATH, priority: 1 });
  }
  const pricesByMarket = new Map();

  for (const source of sources) {
    let csvText;
    try {
      csvText = await fs.readFile(source.path, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }

    for (const price of getLatestPricesByMarket(parseAgmarknetCsv(csvText, {
      cropName,
      state,
    }))) {
      const key = [
        normalizeMandiName(price.mandiName),
        normalizeMandiName(price.state),
      ].join('|');
      const existing = pricesByMarket.get(key);
      if (!existing
        || price.date > existing.price.date
        || (price.date.getTime() === existing.price.date.getTime()
          && source.priority > existing.priority)) {
        pricesByMarket.set(key, { price, priority: source.priority });
      }
    }
  }

  return [...pricesByMarket.values()].map(({ price }) => price);
}

async function getAgmarknetCsvPrices({ cropName, state }) {
  return getCsvCachedPrices({ cropName, state });
}

async function getAgmarknetCsvPriceHistory({ cropName, state }) {
  const sources = [AGMARKNET_CSV_PATH];
  if (state.trim().toLocaleLowerCase() === 'karnataka'
    && path.resolve(KARNATAKA_SELLING_CSV_PATH) !== path.resolve(AGMARKNET_CSV_PATH)) {
    sources.push(KARNATAKA_SELLING_CSV_PATH);
  }

  for (const sourcePath of sources) {
    let csvText;
    try {
      csvText = await fs.readFile(sourcePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    const prices = parseAgmarknetCsv(csvText, { cropName, state });
    if (prices.length > 0) return prices;
  }
  return [];
}

function isUsablePrice(price) {
  return Boolean(
    price.cropName
    && price.mandiName
    && price.state
    && price.date
    && price.modalPrice != null
    && price.modalPrice > 0,
  );
}

function getLatestPricesByMarket(prices) {
  const latestByMarket = new Map();

  for (const price of prices) {
    const key = [price.state, price.district || '', price.mandiName]
      .join('|')
      .toLocaleLowerCase();
    let market = latestByMarket.get(key);

    if (!market || price.date > market.date) {
      market = { ...price, reports: [price] };
      latestByMarket.set(key, market);
    } else if (price.date.getTime() === market.date.getTime()) {
      market.reports.push(price);
    }
  }

  return [...latestByMarket.values()].map((market) => {
    const { reports, ...latestPrice } = market;
    return {
      ...latestPrice,
      modalPrice: reports.reduce((total, price) => total + price.modalPrice, 0) / reports.length,
      minPrice: reports.reduce((total, price) => total + price.minPrice, 0) / reports.length,
      maxPrice: reports.reduce((total, price) => total + price.maxPrice, 0) / reports.length,
    };
  });
}

async function getLiveMarketPrices({ cropName, state }) {
  if (!cropName?.trim()) {
    throw new Error('A crop name is required to fetch live mandi prices.');
  }
  if (!state?.trim()) {
    throw new Error('A state is required to fetch live mandi prices.');
  }

  let records = [];
  let liveFetchError;
  try {
    records = await fetchAllAgmarknetRecords({
      filters: {
        'state.keyword': state.trim(),
        'commodity.keyword': cropName.trim(),
      },
    });
  } catch (error) {
    liveFetchError = error;
    console.warn('Live Agmarknet price request failed; checking saved prices:', error.message);
  }
  const validLiveRecords = records
    .map((record) => ({ record, price: normalizeRecord(record) }))
    .filter(({ price }) => isUsablePrice(price)
      && normalizeCropName(price.cropName) === normalizeCropName(cropName)
      && price.state.toLocaleLowerCase() === state.trim().toLocaleLowerCase());
  const livePrices = validLiveRecords.map(({ price }) => price);

  try {
    await updateAgmarknetCsv(validLiveRecords.map(({ record }) => record));
  } catch (error) {
    console.error('Could not update the Agmarknet CSV from live prices:', error.message);
  }

  const csvCachedPrices = (await getCsvCachedPrices({ cropName, state }))
    .map((price) => ({ ...price, cacheSourcePriority: 1 }));
  const latestByMarket = new Map();
  const liveCandidates = livePrices.map((price) => ({
    ...price,
    dataFreshness: 'live',
    ageDays: 0,
    source: 'Agmarknet',
  }));
  for (const price of [...csvCachedPrices, ...liveCandidates]) {
    const key = [
      price.state.toLocaleLowerCase(),
      normalizeMandiName(price.mandiName),
    ].join('|');
    const current = latestByMarket.get(key);
    if (!current || price.date > current.date) {
      latestByMarket.set(key, {
        date: price.date,
        dataFreshness: price.dataFreshness,
        prices: [price],
      });
    } else if (price.date.getTime() === current.date.getTime()) {
      if (price.dataFreshness === 'live' && current.dataFreshness !== 'live') {
        latestByMarket.set(key, {
          date: price.date,
          dataFreshness: price.dataFreshness,
          prices: [price],
        });
      } else if (price.dataFreshness === current.dataFreshness) {
        if (price.dataFreshness === 'cached') {
          const currentPriority = current.prices[0].cacheSourcePriority || 0;
          if (price.cacheSourcePriority > currentPriority) {
            latestByMarket.set(key, {
              date: price.date,
              dataFreshness: price.dataFreshness,
              prices: [price],
            });
          } else if (price.cacheSourcePriority === currentPriority) {
            current.prices.push(price);
          }
        } else {
          current.prices.push(price);
        }
      }
    }
  }
  const marketPrices = [...latestByMarket.values()].flatMap((market) => market.prices)
    .map(({ cacheSourcePriority, ...price }) => price);

  return {
    prices: marketPrices,
    marketScope: 'state',
    ...(liveFetchError ? { liveUnavailable: true } : {}),
  };
}

module.exports = {
  getLatestPricesByMarket,
  getLiveMarketPrices,
  normalizeCropName,
  parseAgmarknetCsv,
  getAgmarknetCsvCrops,
  getAgmarknetCsvMandis,
  getAgmarknetCsvPrices,
  getAgmarknetCsvPriceHistory,
  refreshAgmarknetCsv,
  writeKarnatakaSellingPriceSnapshot,
  startAgmarknetCsvRefreshScheduler,
};
