const {
  getLatestPricesByMarket,
  getLiveMarketPrices,
  normalizeCropName,
} = require('./liveMarketPriceService');
const { normalizeMandiName } = require('./marketUtils');
const { estimateTransportation } = require('./transportEstimateService');

function dateValue(date) {
  return date ? date.getTime() : 0;
}

function rankMarketPrices(prices) {
  return prices
    .slice()
    .sort((a, b) => b.modalPrice - a.modalPrice || dateValue(b.date) - dateValue(a.date));
}

async function recommendBestMandi({
  cropName,
  state,
  district,
  originLatitude,
  originLongitude,
  quantityKg = 100,
}) {
  if (!cropName || !cropName.trim()) {
    throw new Error('Selected crop name is required.');
  }
  if (!state || !state.trim()) {
    throw new Error('Could not identify your state from your location. Allow location access and try again.');
  }
  const { prices: livePrices, marketScope } = await getLiveMarketPrices({
    cropName,
    state,
  });

  const markets = getLatestPricesByMarket(livePrices)
    .filter((price) => normalizeCropName(price.cropName) === normalizeCropName(cropName));
  if (markets.length === 0) {
    return {
      recommended: null,
      reason: `No Agmarknet price report was found in the latest data or saved snapshot for ${cropName.trim()} in ${state.trim()}.`,
      dataSource: 'Agmarknet',
      retrievedAt: new Date().toISOString(),
      allOptions: [],
      marketScope,
    };
  }
  const latestPrices = markets.map((price) => ({
    mandiName: price.mandiName,
    district: price.district,
    state: price.state,
    modalPrice: price.modalPrice,
    priceUnit: price.priceUnit,
    arrivalDate: price.arrivalDate,
    date: price.date,
    dataFreshness: price.dataFreshness,
    ageDays: price.ageDays,
  }));
  const hasOrigin = originLatitude !== undefined && originLongitude !== undefined;
  const pricedOptions = hasOrigin
    ? await Promise.all(latestPrices.map(async (price) => {
      const transport = await estimateTransportation({
        originLatitude,
        originLongitude,
        destination: [price.mandiName, price.district, price.state, 'India']
          .filter(Boolean)
          .join(', '),
      });
      const grossRevenue = Number((quantityKg * price.modalPrice).toFixed(2));
      return {
        ...price,
        distanceKm: transport.distanceKm,
        transportCost: transport.transportationCost,
        estimatedNetProfit: Number((grossRevenue - transport.transportationCost).toFixed(2)),
      };
    }))
    : latestPrices;
  const allOptions = (hasOrigin
    ? pricedOptions.sort((a, b) => b.estimatedNetProfit - a.estimatedNetProfit)
    : district
    ? pricedOptions.sort((a, b) => {
      const aIsNearby = normalizeMandiName(a.district) === normalizeMandiName(district);
      const bIsNearby = normalizeMandiName(b.district) === normalizeMandiName(district);
      return Number(bIsNearby) - Number(aIsNearby)
        || b.modalPrice - a.modalPrice
        || dateValue(b.date) - dateValue(a.date);
    })
    : rankMarketPrices(pricedOptions))
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
      reportedAt: price.date.toISOString(),
      dataFreshness: price.dataFreshness,
      ageDays: price.ageDays,
      ...(hasOrigin ? {
        distanceKm: price.distanceKm,
        transportCost: price.transportCost,
        estimatedNetProfit: price.estimatedNetProfit,
        estimateQuantityKg: quantityKg,
      } : {}),
    }));
  const best = allOptions[0];

  return {
    recommended: best || null,
    reason: best
      ? hasOrigin
        ? `Highest estimated net return for ${quantityKg} kg from your current location after estimated road transport.${best.dataFreshness === 'cached' ? ` Using the latest saved Agmarknet report from ${best.ageDays} days ago.` : ''}`
        : district && normalizeMandiName(best.mandi.district) === normalizeMandiName(district)
        ? `Best available latest Agmarknet price in your district, ${district.trim()}. This comparison does not include transportation costs.`
        : `Highest latest reported Agmarknet modal price for ${cropName.trim()} in ${state.trim()}. This comparison does not include transportation costs.`
      : `No Agmarknet price report was found in the latest data or saved snapshot for ${cropName.trim()} in ${state.trim()}.`,
    dataSource: 'Agmarknet',
    retrievedAt: new Date().toISOString(),
    allOptions,
    marketScope,
  };
}

module.exports = { recommendBestMandi, rankMarketPrices };
