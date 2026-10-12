const prisma = require('../config/prisma');
const { fetchAgmarknetPage, normalizeRecord } = require('./importService');

function dateValue(date) {
  return date ? date.getTime() : 0;
}

async function recommendBestMandi({ cropId, state }) {
  const crop = await prisma.crop.findUnique({ where: { id: cropId } });
  if (!crop) throw new Error('Selected crop was not found.');
  if (!state || !state.trim()) {
    throw new Error('Could not identify your state from your location. Allow location access and try again.');
  }

  const records = await fetchAgmarknetPage({
    filters: {
      'state.keyword': state.trim(),
      'commodity.keyword': crop.name,
    },
    limit: 100,
  });

  const latestByMarket = new Map();
  for (const record of records) {
    const price = normalizeRecord(record);
    if (
      !price.cropName ||
      !price.mandiName ||
      !price.state ||
      !price.date ||
      price.modalPrice == null ||
      price.modalPrice <= 0
    ) {
      continue;
    }

    const marketKey = [price.state, price.district || '', price.mandiName]
      .join('|')
      .toLocaleLowerCase();
    const current = latestByMarket.get(marketKey);
    if (!current || dateValue(price.date) > dateValue(current.date)) {
      latestByMarket.set(marketKey, price);
    }
  }

  const markets = [...latestByMarket.values()];
  const newestReportTime = Math.max(...markets.map((price) => dateValue(price.date)));
  const allOptions = markets
    .filter((price) => dateValue(price.date) === newestReportTime)
    .sort((a, b) => b.modalPrice - a.modalPrice)
    .slice(0, 5)
    .map((price) => ({
      mandi: {
        id: `${price.state}|${price.district || ''}|${price.mandiName}`,
        name: price.mandiName,
        district: price.district,
        state: price.state,
      },
      modalPrice: price.modalPrice,
      priceUnit: price.priceUnit,
      arrivalDate: price.arrivalDate,
    }));
  const best = allOptions[0];

  return {
    recommended: best || null,
    reason: best
      ? `Highest reported modal price among the newest ${state.trim()} reports. Transport costs are not included.`
      : `No current Agmarknet prices were found for ${crop.name} in ${state.trim()}.`,
    dataSource: 'Agmarknet',
    retrievedAt: new Date().toISOString(),
    allOptions,
  };
}

module.exports = { recommendBestMandi };
