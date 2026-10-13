const { normalizeMandiName } = require('./marketUtils');
const {
  getLatestPricesByMarket,
  getLiveMarketPrices,
} = require('./liveMarketPriceService');
const { estimateTransportation } = require('./transportEstimateService');

function roundCurrency(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

async function calculateProfit({ cropName, mandiName, state, quantityKg, originLatitude, originLongitude }) {
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
  const transport = await estimateTransportation({
    originLatitude: Number(originLatitude),
    originLongitude: Number(originLongitude),
    destination: [mandiName, state, 'India'].filter(Boolean).join(', '),
  });
  const transportCost = transport.transportationCost;

  const grossRevenue = roundCurrency(quantityKg * modalPrice);
  const otherCosts = 0;
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
    ratePerKm: transport.ratePerKm,
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
