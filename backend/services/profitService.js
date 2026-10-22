const { normalizeMandiName } = require('./marketUtils');
const {
  getLatestPricesByMarket,
  getLiveMarketPrices,
} = require('./liveMarketPriceService');
const { estimateTransportation } = require('./transportEstimateService');
const { resolveMandiCoordinates } = require('./mandiCoordinateService');
const { MAX_MANDI_RADIUS_KM, getDistanceKm } = require('./marketDistanceService');

function roundCurrency(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

async function calculateProfit({
  cropName,
  mandiName,
  state,
  quantityKg,
  originLatitude,
  originLongitude,
  transportCostPerKm,
  fixedTransportCost,
  otherCosts = 0,
}) {
  const { prices } = await getLiveMarketPrices({
    cropName,
    state,
  });
  const matchingPrices = getLatestPricesByMarket(prices).filter((price) => (
    normalizeMandiName(price.mandiName) === normalizeMandiName(mandiName)
    && normalizeMandiName(price.state) === normalizeMandiName(state)
  ));
  if (matchingPrices.length === 0) {
    throw new Error('No Agmarknet price report was found for this crop and mandi in the latest data or saved snapshot.');
  }

  const latestDate = Math.max(...matchingPrices.map((price) => price.date.getTime()));
  const latestPrice = matchingPrices.find((price) => price.date.getTime() === latestDate);
  const modalPrice = latestPrice.modalPrice;
  const destinationCoordinates = await resolveMandiCoordinates(mandiName, latestPrice.district, state);
  const searchDistanceKm = getDistanceKm(
    Number(originLatitude),
    Number(originLongitude),
    destinationCoordinates,
  );
  if (searchDistanceKm > MAX_MANDI_RADIUS_KM) {
    throw new Error(`The selected mandi is more than ${MAX_MANDI_RADIUS_KM} km from your location.`);
  }
  const transport = await estimateTransportation({
    originLatitude: Number(originLatitude),
    originLongitude: Number(originLongitude),
    destination: [mandiName, state, 'India'].filter(Boolean).join(', '),
    destinationCoordinates,
  });
  const transportCost = transportCostPerKm !== undefined
    ? roundCurrency(transport.distanceKm * transportCostPerKm)
    : fixedTransportCost !== undefined
    ? roundCurrency(fixedTransportCost)
    : transport.transportationCost;

  const grossRevenue = roundCurrency(quantityKg * modalPrice);
  const totalCost = roundCurrency(transportCost + otherCosts);
  const netProfit = roundCurrency(grossRevenue - totalCost);

  return {
    modalPrice: Number(modalPrice.toFixed(2)),
    grossRevenue,
    transportCost,
    otherCosts,
    totalCost,
    netProfit,
    distanceKm: transport.distanceKm,
    searchDistanceKm: Number(searchDistanceKm.toFixed(1)),
    ratePerKm: transportCostPerKm ?? (fixedTransportCost === undefined ? transport.ratePerKm : null),
    routeCoordinates: transport.routeCoordinates,
    originCoordinates: transport.originCoordinates,
    destinationCoordinates: transport.destinationCoordinates,
    priceDate: new Date(latestDate).toISOString().slice(0, 10),
    dataFreshness: latestPrice.dataFreshness,
    ageDays: latestPrice.ageDays,
    dataSource: 'Agmarknet',
  };
}

module.exports = { calculateProfit };
