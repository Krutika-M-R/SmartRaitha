const prisma = require('../config/prisma');

// Gross Revenue = Quantity x Price
// Total Cost    = Transportation + Other Costs
// Net Profit    = Gross Revenue - Total Cost
async function calculateProfit({ cropId, mandiId, quantityKg, distanceKm }) {
  const price = await prisma.price.findFirst({
    where: { cropId, mandiId },
    orderBy: { date: 'desc' }
  });
  if (!price) throw new Error('No price data found for this crop/mandi.');

  const transport = await prisma.transportationCost.findFirst({ where: { mandiId } });

  let transportCost = 0;
  if (transport) {
    const ratePerKm = Number(transport.ratePerKm ?? 0);
    const travelDistanceKm = Number(distanceKm ?? transport.distanceKm ?? 0);
    const estimatedCost = Number(transport.estimatedCost ?? 0);

    if (travelDistanceKm > 0 && ratePerKm > 0) {
      transportCost = travelDistanceKm * ratePerKm;
    } else if (estimatedCost > 0) {
      transportCost = estimatedCost;
    }
  }

  const grossRevenue = quantityKg * price.modalPrice;
  const otherCosts = 0; // extend later: commission, loading charges, etc.
  const totalCost = transportCost + otherCosts;
  const netProfit = grossRevenue - totalCost;

  return {
    modalPrice: price.modalPrice,
    grossRevenue,
    transportCost,
    otherCosts,
    totalCost,
    netProfit,
    distanceKm: distanceKm ?? (transport ? Number(transport.distanceKm ?? 0) : null)
  };
}

module.exports = { calculateProfit };
