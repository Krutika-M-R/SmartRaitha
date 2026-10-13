const { fetchAllAgmarknetRecords, normalizeRecord } = require('./importService');
const { normalizeMandiName } = require('./marketUtils');

const DAY_MS = 24 * 60 * 60 * 1000;

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

function buildTwoDayForecast(rawRecords, { mandiNames, targetDate }) {
  const target = parseTargetDate(targetDate);
  const requestedMarkets = new Map(
    mandiNames.map((name) => [normalizeMandiName(name), name]),
  );
  const dailyPrices = new Map();

  for (const record of rawRecords) {
    const price = normalizeRecord(record);
    const requestedName = requestedMarkets.get(normalizeMandiName(price.mandiName));
    if (!requestedName || !price.date || price.modalPrice == null || price.modalPrice <= 0) continue;

    const day = price.date.toISOString().slice(0, 10);
    const marketPrices = dailyPrices.get(requestedName) || new Map();
    const dayPrices = marketPrices.get(day) || [];
    dayPrices.push(price.modalPrice);
    marketPrices.set(day, dayPrices);
    dailyPrices.set(requestedName, marketPrices);
  }

  const predictions = [];
  for (const [mandiName, pricesByDay] of dailyPrices) {
    const observations = [...pricesByDay.entries()]
      .map(([date, prices]) => ({
        time: new Date(`${date}T00:00:00.000Z`).getTime(),
        price: prices.reduce((total, price) => total + price, 0) / prices.length,
      }))
      .sort((a, b) => a.time - b.time)
      .slice(-7);
    if (observations.length === 0) continue;

    const origin = observations[0].time;
    const points = observations.map(({ time, price }) => ({
      day: (time - origin) / DAY_MS,
      price,
    }));
    const targetDay = (target.getTime() - origin) / DAY_MS;
    let predictedPrice = points[points.length - 1].price;
    let modelVersion = 'Agmarknet persistence (1 report)';

    if (points.length > 1) {
      const meanDay = points.reduce((total, point) => total + point.day, 0) / points.length;
      const meanPrice = points.reduce((total, point) => total + point.price, 0) / points.length;
      const denominator = points.reduce((total, point) => total + (point.day - meanDay) ** 2, 0);
      const slope = denominator === 0
        ? 0
        : points.reduce(
          (total, point) => total + (point.day - meanDay) * (point.price - meanPrice),
          0,
        ) / denominator;
      predictedPrice = meanPrice + slope * (targetDay - meanDay);
      modelVersion = `Agmarknet linear trend (${points.length} reports)`;
    }

    predictions.push({
      mandiName,
      predictedDate: targetDate,
      predictedPrice: Number(Math.max(0, predictedPrice).toFixed(2)),
      sampleCount: observations.length,
      modelVersion,
    });
  }

  return predictions;
}

async function predictTwoDayPrices({ cropName, state, mandiNames, targetDate }) {
  if (!cropName || !cropName.trim()) throw new Error('cropName is required.');
  if (!state || !state.trim()) throw new Error('state is required.');
  if (!Array.isArray(mandiNames) || mandiNames.length === 0
    || mandiNames.some((name) => typeof name !== 'string' || !name.trim())) {
    throw new Error('At least one mandi name is required.');
  }
  parseTargetDate(targetDate);

  const records = await fetchAllAgmarknetRecords({
    filters: {
      'state.keyword': state.trim(),
      'commodity.keyword': cropName.trim(),
    },
  });
  const predictions = buildTwoDayForecast(records, { mandiNames, targetDate });
  if (predictions.length === 0) {
    throw new Error('No Agmarknet price history was found for the selected mandis and crop.');
  }

  return {
    dataSource: 'Agmarknet',
    predictions,
  };
}

module.exports = { predictTwoDayPrices, buildTwoDayForecast };
