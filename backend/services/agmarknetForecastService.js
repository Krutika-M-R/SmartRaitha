const { fetchAllAgmarknetRecords, normalizeRecord } = require('./importService');
const { normalizeMandiName } = require('./marketUtils');
const { getAgmarknetCsvPriceHistory } = require('./liveMarketPriceService');
const { getRandomForestForecast } = require('./mlClient');

function parseTargetDate(targetDate) {
  if (typeof targetDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    throw new Error('targetDate must use YYYY-MM-DD format.');
  }
  const parsed = new Date(`${targetDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== targetDate) {
    throw new Error('targetDate is not a valid calendar date.');
  }
  return parsed;
}

function buildMandiObservations(rawRecords, { mandiNames, dataFreshness = 'live' }) {
  const requestedMarkets = new Map(
    mandiNames.map((name) => [normalizeMandiName(name), name]),
  );
  const dailyPrices = new Map();

  for (const record of rawRecords) {
    const price = record.date instanceof Date && typeof record.mandiName === 'string'
      ? record
      : normalizeRecord(record);
    const requestedName = requestedMarkets.get(normalizeMandiName(price.mandiName));
    if (
      !requestedName
      || !(price.date instanceof Date)
      || Number.isNaN(price.date.getTime())
      || !Number.isFinite(price.modalPrice)
      || price.modalPrice <= 0
    ) continue;

    const day = price.date.toISOString().slice(0, 10);
    const marketPrices = dailyPrices.get(requestedName) || new Map();
    const dayPrices = marketPrices.get(day) || [];
    dayPrices.push(price.modalPrice);
    marketPrices.set(day, dayPrices);
    dailyPrices.set(requestedName, marketPrices);
  }

  return [...dailyPrices.entries()].map(([mandiName, pricesByDay]) => {
    const observations = [...pricesByDay.entries()]
      .map(([date, prices]) => ({
        date,
        price: prices.reduce((total, price) => total + price, 0) / prices.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const latest = observations[observations.length - 1];
    return {
      mandiName,
      modalPrice: latest.price,
      latestPriceDate: latest.date,
      sampleCount: observations.length,
      dataFreshness,
    };
  });
}

async function predictTwoDayPrices({ cropName, state, mandiNames, targetDate }) {
  if (typeof cropName !== 'string' || !cropName.trim()) throw new Error('cropName is required.');
  if (typeof state !== 'string' || !state.trim()) throw new Error('state is required.');
  if (!Array.isArray(mandiNames) || mandiNames.length === 0
    || mandiNames.some((name) => typeof name !== 'string' || !name.trim())) {
    throw new Error('At least one mandi name is required.');
  }
  parseTargetDate(targetDate);
  if (state.trim().toLocaleLowerCase() !== 'karnataka') {
    throw new Error('The ten-year Random Forest forecast is currently available only for Karnataka.');
  }

  let liveRecords = [];
  try {
    liveRecords = await fetchAllAgmarknetRecords({
      filters: {
        'state.keyword': state.trim(),
        'commodity.keyword': cropName.trim(),
      },
    });
  } catch (error) {
    console.warn('Live Agmarknet forecast request failed; checking saved price history:', error.message);
  }

  const liveObservations = buildMandiObservations(liveRecords, {
    mandiNames,
    dataFreshness: 'live',
  });
  const observedMarkets = new Map(
    liveObservations.map((observation) => [
      normalizeMandiName(observation.mandiName),
      observation,
    ]),
  );
  const missingMandis = mandiNames.filter(
    (name) => !observedMarkets.has(normalizeMandiName(name)),
  );
  if (missingMandis.length > 0) {
    const savedRecords = await getAgmarknetCsvPriceHistory({ cropName, state });
    const cachedObservations = buildMandiObservations(savedRecords, {
      mandiNames: missingMandis,
      dataFreshness: 'cached',
    });
    for (const observation of cachedObservations) {
      observedMarkets.set(normalizeMandiName(observation.mandiName), observation);
    }
  }

  const mandiPrices = mandiNames
    .map((name) => observedMarkets.get(normalizeMandiName(name)))
    .filter(Boolean);
  if (mandiPrices.length === 0) {
    throw new Error('No Agmarknet price history was found for the selected mandis and crop.');
  }

  const forecast = await getRandomForestForecast({
    cropName: cropName.trim(),
    state: state.trim(),
    targetDate,
    mandiPrices,
  });
  const freshnessValues = new Set(mandiPrices.map((price) => price.dataFreshness));
  return {
    ...forecast,
    dataFreshness: freshnessValues.size > 1 ? 'mixed' : mandiPrices[0].dataFreshness,
  };
}

module.exports = { predictTwoDayPrices, buildMandiObservations };
