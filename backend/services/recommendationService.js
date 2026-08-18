const prisma = require('../config/prisma');
const { calculateProfit } = require('./profitService');

async function recommendBestMandi({ cropId, quantityKg }) {
  const mandisWithPrice = await prisma.price.findMany({
    where: { cropId },
    distinct: ['mandiId'],
    include: { mandi: true }
  });

  const results = [];
  for (const entry of mandisWithPrice) {
    try {
      const profit = await calculateProfit({ cropId, mandiId: entry.mandiId, quantityKg });
      results.push({ mandi: entry.mandi, ...profit });
    } catch (e) {
      // skip mandis with no usable price/transport data
    }
  }

  results.sort((a, b) => b.netProfit - a.netProfit);
  const best = results[0];

  return {
    recommended: best || null,
    reason: best
      ? `${best.mandi.name} gives the highest estimated net profit after transportation cost.`
      : 'Not enough data to make a recommendation yet.',
    allOptions: results
  };
}

module.exports = { recommendBestMandi };
