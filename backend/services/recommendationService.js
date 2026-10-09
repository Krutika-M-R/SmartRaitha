const prisma = require('../config/prisma');
const { calculateProfit } = require('./profitService');

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function recommendBestMandi({ cropId, quantityKg, latitude, longitude }) {
  const mandisWithPrice = await prisma.price.findMany({
    where: { cropId },
    distinct: ['mandiId'],
    include: { mandi: true },
  });

  const results = [];
  for (const entry of mandisWithPrice) {
    try {
      const mandi = entry.mandi;
      if (!mandi || mandi.latitude == null || mandi.longitude == null) continue;

      const distanceKm = calculateDistance(latitude, longitude, mandi.latitude, mandi.longitude);
      const profit = await calculateProfit({ cropId, mandiId: entry.mandiId, quantityKg, distanceKm });
      results.push({ mandi, distanceKm, ...profit });
    } catch (e) {
      // skip mandis with no usable price/transport data
    }
  }

  results.sort((a, b) => b.netProfit - a.netProfit);
  const topMandis = results.slice(0, 5);
  const best = topMandis[0];

  return {
    recommended: best || null,
    reason: best
      ? `${best.mandi.name} gives the highest estimated net profit after transportation cost (${best.distanceKm.toFixed(1)} km away).`
      : 'Not enough data to make a recommendation yet.',
    allOptions: topMandis,
  };
}

module.exports = { recommendBestMandi };
