const prisma = require('../config/prisma');

// Gross Revenue = Quantity x Price
// Total Cost    = Transportation + Other Costs
// Net Profit    = Gross Revenue - Total Cost
async function calculateProfit({ cropId, mandiId, quantityKg }) {
  const price = await prisma.price.findFirst({
    where: { cropId, mandiId },
    orderBy: { date: 'desc' }
  });
  if (!price) throw new Error('No price data found for this crop/mandi.');

  const transport = await prisma.transportationCost.findFirst({ where: { mandiId } });
  const transportCost = transport ? transport.estimatedCost : 0;

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
    netProfit
  };
}

module.exports = { calculateProfit };
