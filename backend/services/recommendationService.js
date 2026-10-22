const {
  getLatestPricesByMarket,
  getLiveMarketPrices,
  normalizeCropName,
} = require('./liveMarketPriceService');
const { normalizeMandiName } = require('./marketUtils');
const { estimateTransportation } = require('./transportEstimateService');
const { resolveMandiCoordinates } = require('./mandiCoordinateService');
const {
  DEFAULT_MANDI_RADIUS_KM,
  MAX_MANDI_RADIUS_KM,
  getDistanceKm,
} = require('./marketDistanceService');

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
  transportCostPerKm,
  fixedTransportCost,
  otherCosts = 0,
}) {
  if (!cropName || !cropName.trim()) {
    throw new Error('Selected crop name is required.');
  }
  if (!state || !state.trim()) {
    throw new Error('Could not identify your state from your location. Allow location access and try again.');
  }
  const { prices: livePrices, marketScope, liveUnavailable } = await getLiveMarketPrices({
    cropName,
    state,
  });

  const markets = getLatestPricesByMarket(livePrices)
    .filter((price) => normalizeCropName(price.cropName) === normalizeCropName(cropName));
  if (markets.length === 0) {
    return {
      recommended: null,
      reason: liveUnavailable
        ? `Live Agmarknet is temporarily unreachable, and the saved snapshot has no price report for ${cropName.trim()} in ${state.trim()}. Try again after the data source is available.`
        : `No Agmarknet price report was found in the latest data or saved snapshot for ${cropName.trim()} in ${state.trim()}.`,
      dataSource: 'Agmarknet',
      retrievedAt: new Date().toISOString(),
      allOptions: [],
      marketScope,
    };
  }
  const latestPrices = await Promise.all(markets.map(async (price) => ({
    mandiName: price.mandiName,
    district: price.district,
    state: price.state,
    coordinates: await resolveMandiCoordinates(price.mandiName, price.district, price.state),
    modalPrice: price.modalPrice,
    priceUnit: price.priceUnit,
    arrivalDate: price.arrivalDate,
    date: price.date,
    dataFreshness: price.dataFreshness,
    ageDays: price.ageDays,
  })));
  const hasOrigin = originLatitude !== undefined && originLongitude !== undefined;
  let searchRadiusKm = null;
  let nearbyPrices = latestPrices;
  if (hasOrigin) {
    const pricesWithDistance = latestPrices.map((price) => ({
      ...price,
      distanceKm: getDistanceKm(
        Number(originLatitude),
        Number(originLongitude),
        price.coordinates,
      ),
    }));
    const withinDefaultRadius = pricesWithDistance.filter(
      (price) => price.distanceKm <= DEFAULT_MANDI_RADIUS_KM,
    );
    searchRadiusKm = withinDefaultRadius.length ? DEFAULT_MANDI_RADIUS_KM : MAX_MANDI_RADIUS_KM;
    nearbyPrices = (withinDefaultRadius.length
      ? withinDefaultRadius
      : pricesWithDistance.filter((price) => price.distanceKm <= MAX_MANDI_RADIUS_KM));
  }
  if (hasOrigin && nearbyPrices.length === 0) {
    return {
      recommended: null,
      reason: `No mandi with a reported ${cropName.trim()} price was found within ${MAX_MANDI_RADIUS_KM} km.`,
      dataSource: 'Agmarknet',
      retrievedAt: new Date().toISOString(),
      allOptions: [],
      marketScope,
      searchRadiusKm: MAX_MANDI_RADIUS_KM,
    };
  }
  const pricedOptions = hasOrigin
    ? await Promise.all(nearbyPrices.map(async (price) => {
      const transport = await estimateTransportation({
        originLatitude,
        originLongitude,
        destination: [price.mandiName, price.district, price.state, 'India']
          .filter(Boolean)
          .join(', '),
        destinationCoordinates: price.coordinates,
      });
      const grossRevenue = Number((quantityKg * price.modalPrice).toFixed(2));
      const transportCost = transportCostPerKm !== undefined
        ? Number((transport.distanceKm * transportCostPerKm).toFixed(2))
        : fixedTransportCost !== undefined
        ? fixedTransportCost
        : transport.transportationCost;
      const totalCosts = Number((transportCost + otherCosts).toFixed(2));
      return {
        ...price,
        searchDistanceKm: price.distanceKm,
        distanceKm: transport.distanceKm,
        roadDistanceKm: transport.distanceKm,
        transportCost,
        otherCosts,
        estimatedNetProfit: Number((grossRevenue - totalCosts).toFixed(2)),
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
        latitude: price.coordinates?.latitude ?? null,
        longitude: price.coordinates?.longitude ?? null,
        coordinatePrecision: price.coordinates?.coordinatePrecision ?? null,
      },
      modalPrice: price.modalPrice,
      priceUnit: price.priceUnit,
      arrivalDate: price.arrivalDate,
      reportedAt: price.date.toISOString(),
      dataFreshness: price.dataFreshness,
      ageDays: price.ageDays,
      ...(hasOrigin ? {
        distanceKm: price.distanceKm,
        searchDistanceKm: price.searchDistanceKm,
        roadDistanceKm: price.roadDistanceKm,
        transportCost: price.transportCost,
        otherCosts: price.otherCosts,
        estimatedNetProfit: price.estimatedNetProfit,
        estimateQuantityKg: quantityKg,
      } : {}),
    }));
  const best = allOptions[0];
  const transportBasis = transportCostPerKm !== undefined || fixedTransportCost !== undefined
    ? 'after the entered transport cost and other charges.'
    : 'after estimated road transport.';

  return {
    recommended: best || null,
    reason: best
      ? hasOrigin
        ? `Highest estimated net return for ${quantityKg} kg from your current location ${transportBasis}${best.dataFreshness === 'cached' ? ` Using the latest saved Agmarknet report from ${best.ageDays} days ago.` : ''}`
        : district && normalizeMandiName(best.mandi.district) === normalizeMandiName(district)
        ? `Best available latest Agmarknet price in your district, ${district.trim()}. This comparison does not include transportation costs.`
        : `Highest latest reported Agmarknet modal price for ${cropName.trim()} in ${state.trim()}. This comparison does not include transportation costs.`
      : `No Agmarknet price report was found in the latest data or saved snapshot for ${cropName.trim()} in ${state.trim()}.`,
    dataSource: 'Agmarknet',
    retrievedAt: new Date().toISOString(),
    allOptions,
    marketScope,
    ...(hasOrigin ? { searchRadiusKm } : {}),
  };
}

module.exports = {
  DEFAULT_MANDI_RADIUS_KM,
  MAX_MANDI_RADIUS_KM,
  recommendBestMandi,
  rankMarketPrices,
};
