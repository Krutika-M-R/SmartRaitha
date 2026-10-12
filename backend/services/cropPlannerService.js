const axios = require('axios');
const prisma = require('../config/prisma');

const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const CLIMATE_CACHE_TTL = 24 * 60 * 60 * 1000;
const climateCache = new Map();

const cropProfiles = {
  tomato: {
    emoji: '🍅', durationDays: [90, 120], water: 'Medium', waterScore: 2,
    soils: ['red', 'loamy', 'alluvial'], months: [1, 2, 3, 6, 7, 8, 9, 10, 11, 12],
    rainfall: [40, 180], temperature: [18, 32], yieldKgPerAcre: [8000, 12000], costInrPerAcre: [70000, 120000],
    groups: ['vegetable', 'short-duration'],
  },
  onion: {
    emoji: '🧅', durationDays: [100, 130], water: 'Medium', waterScore: 2,
    soils: ['red', 'black', 'loamy', 'alluvial'], months: [1, 6, 7, 8, 9, 10, 11, 12],
    rainfall: [30, 150], temperature: [13, 30], yieldKgPerAcre: [6000, 10000], costInrPerAcre: [45000, 85000],
    groups: ['vegetable', 'short-duration'],
  },
  potato: {
    emoji: '🥔', durationDays: [90, 120], water: 'Medium', waterScore: 2,
    soils: ['red', 'loamy', 'alluvial'], months: [10, 11, 12, 1, 2],
    rainfall: [25, 100], temperature: [12, 25], yieldKgPerAcre: [6000, 10000], costInrPerAcre: [65000, 110000],
    groups: ['vegetable', 'short-duration'],
  },
  chilli: {
    emoji: '🌶️', durationDays: [150, 210], water: 'Medium', waterScore: 2,
    soils: ['red', 'black', 'loamy'], months: [6, 7, 8, 9, 10, 11],
    rainfall: [50, 180], temperature: [20, 32], yieldKgPerAcre: [2500, 5000], costInrPerAcre: [60000, 110000],
    groups: ['vegetable', 'long-duration'],
  },
  cotton: {
    emoji: '☁️', durationDays: [150, 180], water: 'Medium', waterScore: 2,
    soils: ['black', 'red'], months: [6, 7],
    rainfall: [50, 160], temperature: [21, 35], yieldKgPerAcre: [800, 1400], costInrPerAcre: [25000, 45000],
    groups: ['commercial', 'long-duration'],
  },
  groundnut: {
    emoji: '🥜', durationDays: [100, 125], water: 'Low to medium', waterScore: 1,
    soils: ['red', 'sandy', 'loamy'], months: [1, 2, 6, 7, 8],
    rainfall: [40, 140], temperature: [22, 32], yieldKgPerAcre: [600, 1000], costInrPerAcre: [22000, 40000],
    groups: ['oilseed', 'short-duration'],
  },
  rice: {
    emoji: '🌾', durationDays: [120, 150], water: 'High', waterScore: 3,
    soils: ['clay', 'alluvial', 'loamy'], months: [6, 7, 8, 9, 10, 11],
    rainfall: [100, 300], temperature: [20, 34], yieldKgPerAcre: [1800, 2800], costInrPerAcre: [30000, 55000],
    groups: ['cereal', 'water-intensive'],
  },
  maize: {
    emoji: '🌽', durationDays: [90, 115], water: 'Medium', waterScore: 2,
    soils: ['red', 'black', 'loamy', 'alluvial'], months: [1, 2, 6, 7, 8, 9, 10, 11],
    rainfall: [50, 180], temperature: [18, 33], yieldKgPerAcre: [1800, 3000], costInrPerAcre: [22000, 40000],
    groups: ['cereal', 'short-duration'],
  },
};

function getRegion(latitude, longitude) {
  if (latitude >= 11 && latitude <= 15.5 && longitude >= 73 && longitude <= 75) return 'Coastal Karnataka';
  if (latitude >= 14 && latitude <= 18.5 && longitude >= 74 && longitude <= 78.5) return 'North Karnataka';
  if (latitude >= 11 && latitude < 14 && longitude > 75.6 && longitude <= 79.5) return 'South Karnataka';
  return 'Nearby region';
}

function distanceKm(a, b) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const startLat = radians(a.latitude);
  const endLat = radians(b.latitude);
  const haversine = Math.sin(dLat / 2) ** 2
    + Math.cos(startLat) * Math.cos(endLat) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getHarvestDate(year, month, durationDays) {
  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCDate(date.getUTCDate() + durationDays);
  return date.toISOString().slice(0, 10);
}

async function getClimateNormal({ latitude, longitude, month }) {
  const cacheKey = `${latitude.toFixed(2)}:${longitude.toFixed(2)}:${month}`;
  const cached = climateCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CLIMATE_CACHE_TTL) return cached.data;

  const currentYear = new Date().getUTCFullYear();
  const endYear = currentYear - 1;
  const startYear = endYear - 4;
  const response = await axios.get(ARCHIVE_URL, {
    timeout: 15000,
    params: {
      latitude,
      longitude,
      start_date: `${startYear}-01-01`,
      end_date: `${endYear}-12-31`,
      daily: 'precipitation_sum,temperature_2m_mean',
      timezone: 'auto',
    },
  });

  const daily = response.data.daily;
  if (!daily?.time?.length || !daily.precipitation_sum?.length || !daily.temperature_2m_mean?.length) {
    throw new Error('Historical weather normals are not available for this location.');
  }

  const monthsByYear = new Map();
  daily.time.forEach((date, index) => {
    if (Number(date.slice(5, 7)) !== month) return;
    const year = date.slice(0, 4);
    const values = monthsByYear.get(year) || { rain: 0, temperature: 0, days: 0 };
    const rain = Number(daily.precipitation_sum[index]);
    const temperature = Number(daily.temperature_2m_mean[index]);
    if (Number.isFinite(rain)) values.rain += rain;
    if (Number.isFinite(temperature)) {
      values.temperature += temperature;
      values.days += 1;
    }
    monthsByYear.set(year, values);
  });

  const validYears = [...monthsByYear.values()].filter((value) => value.days > 0);
  if (!validYears.length) throw new Error('Historical weather normals are not available for this month.');

  const data = {
    rainfallMm: validYears.reduce((sum, value) => sum + value.rain, 0) / validYears.length,
    temperatureC: validYears.reduce((sum, value) => sum + value.temperature / value.days, 0) / validYears.length,
    years: validYears.length,
  };
  climateCache.set(cacheKey, { data, cachedAt: Date.now() });
  return data;
}

function calculateSuitability(profile, { month, climate, soilType, irrigation, preferredCropIds, cropId }) {
  let score = 45;
  const reasons = [];

  if (profile.months.includes(month)) {
    score += 24;
    reasons.push('The selected month matches a common sowing window for this crop.');
  } else {
    score -= 12;
    reasons.push('This month is outside the crop’s main sowing window.');
  }

  const [minimumRain, maximumRain] = profile.rainfall;
  if (climate.rainfallMm >= minimumRain && climate.rainfallMm <= maximumRain) {
    score += 18;
    reasons.push(`Historical rainfall for this month averages ${Math.round(climate.rainfallMm)} mm, within the crop’s planning range.`);
  } else if (climate.rainfallMm < minimumRain && irrigation !== 'rainfed') {
    score += 6;
    reasons.push('Irrigation can help offset the lower historical rainfall.');
  } else {
    score -= 8;
    reasons.push(`Historical rainfall averages ${Math.round(climate.rainfallMm)} mm; check water availability and drainage.`);
  }

  const [minimumTemp, maximumTemp] = profile.temperature;
  if (climate.temperatureC >= minimumTemp && climate.temperatureC <= maximumTemp) {
    score += 10;
    reasons.push(`The historical monthly mean temperature (${climate.temperatureC.toFixed(1)}°C) is in the crop’s planning range.`);
  } else {
    score -= 6;
    reasons.push('Historical monthly temperature is outside the crop’s preferred planning range.');
  }

  if (!soilType || soilType === 'unknown') {
    reasons.push('Soil match is not included until you select a soil type.');
  } else if (profile.soils.includes(soilType)) {
    score += 12;
    reasons.push('The selected soil type is suitable for this crop.');
  } else {
    score -= 10;
    reasons.push('The selected soil type is less suitable; consider a local soil test and expert advice.');
  }

  if (profile.waterScore === 3 && irrigation === 'rainfed' && climate.rainfallMm < maximumRain) {
    score -= 10;
    reasons.push('This crop needs reliable water; rain-fed cultivation may be risky.');
  } else if (irrigation !== 'rainfed' && profile.waterScore >= 2) {
    score += 4;
    reasons.push('Your irrigation selection supports this crop’s water needs.');
  }

  if (preferredCropIds.includes(cropId)) {
    score += 8;
    reasons.push('This crop matches your selected preferences.');
  }

  return { score: Math.max(20, Math.min(98, Math.round(score))), reasons };
}

async function getNearbyMarketData(crops, latitude, longitude, farmSizeAcres) {
  const cropIds = crops.map((crop) => crop.id);
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 6);
  const records = await prisma.price.findMany({
    where: { cropId: { in: cropIds }, date: { gte: since }, priceUnit: 'KG' },
    include: { mandi: true },
    orderBy: { date: 'desc' },
  });

  const results = new Map();
  for (const crop of crops) {
    const geoPrices = records
      .filter((record) => record.cropId === crop.id
        && Number.isFinite(record.mandi.latitude)
        && Number.isFinite(record.mandi.longitude))
      .map((record) => ({
        record,
        distance: distanceKm(
          { latitude, longitude },
          { latitude: record.mandi.latitude, longitude: record.mandi.longitude },
        ),
      }))
      .filter((entry) => entry.distance <= 250)
      .sort((a, b) => a.distance - b.distance);

    const distancesByMandi = new Map();
    geoPrices.forEach((entry) => {
      if (!distancesByMandi.has(entry.record.mandiId)) {
        distancesByMandi.set(entry.record.mandiId, entry.distance);
      }
    });
    const nearestIds = [...distancesByMandi.entries()]
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .map(([mandiId]) => mandiId);
    const localRecords = geoPrices
      .filter((entry) => nearestIds.includes(entry.record.mandiId))
      .map((entry) => entry.record)
      .sort((a, b) => b.date - a.date);
    const monthly = new Map();
    localRecords.forEach((record) => {
      const key = `${record.date.getUTCFullYear()}-${String(record.date.getUTCMonth() + 1).padStart(2, '0')}`;
      const bucket = monthly.get(key) || { total: 0, count: 0, date: record.date };
      bucket.total += record.modalPrice;
      bucket.count += 1;
      monthly.set(key, bucket);
    });
    const trend = [...monthly.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, value]) => ({
        month: key,
        modalPricePerKg: Number((value.total / value.count).toFixed(2)),
      }));
    const latest = localRecords[0];
    const profile = cropProfiles[crop.name.toLowerCase()];
    let finance = null;
    if (latest && profile) {
      const unitPrice = latest.modalPrice;
      const lowProfit = profile.yieldKgPerAcre[0] * unitPrice - profile.costInrPerAcre[1];
      const highProfit = profile.yieldKgPerAcre[1] * unitPrice - profile.costInrPerAcre[0];
      finance = {
        cultivationCostInr: profile.costInrPerAcre.map((amount) => Math.round(amount * farmSizeAcres)),
        estimatedRevenueInr: profile.yieldKgPerAcre.map((yieldKg) => Math.round(yieldKg * unitPrice * farmSizeAcres)),
        potentialProfitInr: [
          Math.round(lowProfit * farmSizeAcres),
          Math.round(highProfit * farmSizeAcres),
        ],
        priceDate: latest.date.toISOString().slice(0, 10),
        mandi: latest.mandi.name,
      };
    }

    results.set(crop.id, {
      unit: 'INR_PER_KG',
      latestPricePerKg: latest?.modalPrice ?? null,
      latestPriceDate: latest?.date.toISOString().slice(0, 10) ?? null,
      mandi: latest?.mandi.name ?? null,
      trend,
      finance,
    });
  }
  return results;
}

async function getCropPlan({ latitude, longitude, month, year, soilType = 'unknown', irrigation = 'rainfed', farmSizeAcres = 1, preferredCropIds = [] }) {
  const climate = await getClimateNormal({ latitude, longitude, month });
  const crops = await prisma.crop.findMany({ orderBy: { name: 'asc' } });
  const supportedCrops = crops.filter((crop) => cropProfiles[crop.name.toLowerCase()]);
  const marketByCrop = await getNearbyMarketData(supportedCrops, latitude, longitude, farmSizeAcres);

  const recommendations = supportedCrops.map((crop) => {
    const profile = cropProfiles[crop.name.toLowerCase()];
    const suitability = calculateSuitability(profile, {
      month,
      climate,
      soilType,
      irrigation,
      preferredCropIds,
      cropId: crop.id,
    });
    const middleDuration = Math.round((profile.durationDays[0] + profile.durationDays[1]) / 2);
    return {
      cropId: crop.id,
      crop: crop.name,
      image: profile.emoji,
      score: suitability.score,
      reasons: suitability.reasons,
      sowingDate: `${year}-${String(month).padStart(2, '0')}-01`,
      durationDays: profile.durationDays,
      harvestDate: getHarvestDate(year, month, middleDuration),
      waterNeeds: profile.water,
      yieldKgPerAcre: profile.yieldKgPerAcre,
      cultivationCostInrPerAcre: profile.costInrPerAcre,
      soilTypes: profile.soils,
      market: marketByCrop.get(crop.id),
    };
  }).sort((a, b) => b.score - a.score).slice(0, 3);

  return {
    month,
    year,
    region: getRegion(latitude, longitude),
    farmSizeAcres,
    climate: {
      ...climate,
      source: 'Open-Meteo historical weather archive; monthly averages from completed years',
    },
    estimatesNote: 'Yield and cultivation-cost figures are generic planning ranges, not district-specific official forecasts; validate them with your local KVK. Market-based estimates use only nearby recorded prices explicitly stored in INR/kg. Historical rainfall is a climate normal, not a six-month weather forecast.',
    recommendations,
  };
}

module.exports = { getCropPlan };
