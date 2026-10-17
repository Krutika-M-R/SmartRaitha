const axios = require('axios');

const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const CLIMATE_CACHE_TTL = 24 * 60 * 60 * 1000;
const climateCache = new Map();

const cropProfiles = {
  tomato: {
    emoji: '🍅', durationDays: [90, 120], water: 'Medium', waterScore: 2,
    soils: ['red', 'loamy', 'alluvial'], months: [1, 2, 3, 6, 7, 8, 9, 10, 11, 12],
    rainfall: [40, 180], temperature: [18, 32], yieldKgPerAcre: [8000, 12000], costInrPerAcre: [70000, 120000],
    irrigationTypes: ['drip', 'borewell', 'canal'],
    groups: ['vegetable', 'short-duration'],
  },
  onion: {
    emoji: '🧅', durationDays: [100, 130], water: 'Medium', waterScore: 2,
    soils: ['red', 'black', 'loamy', 'alluvial'], months: [1, 6, 7, 8, 9, 10, 11, 12],
    rainfall: [30, 150], temperature: [13, 30], yieldKgPerAcre: [6000, 10000], costInrPerAcre: [45000, 85000],
    irrigationTypes: ['drip', 'borewell', 'canal'],
    groups: ['vegetable', 'short-duration'],
  },
  potato: {
    emoji: '🥔', durationDays: [90, 120], water: 'Medium', waterScore: 2,
    soils: ['red', 'loamy', 'alluvial'], months: [10, 11, 12, 1, 2],
    rainfall: [25, 100], temperature: [12, 25], yieldKgPerAcre: [6000, 10000], costInrPerAcre: [65000, 110000],
    irrigationTypes: ['drip', 'borewell', 'canal'],
    groups: ['vegetable', 'short-duration'],
  },
  chilli: {
    emoji: '🌶️', durationDays: [150, 210], water: 'Medium', waterScore: 2,
    soils: ['red', 'black', 'loamy'], months: [6, 7, 8, 9, 10, 11],
    rainfall: [50, 180], temperature: [20, 32], yieldKgPerAcre: [2500, 5000], costInrPerAcre: [60000, 110000],
    irrigationTypes: ['drip', 'borewell'],
    groups: ['vegetable', 'long-duration'],
  },
  cotton: {
    emoji: '☁️', durationDays: [150, 180], water: 'Medium', waterScore: 2,
    soils: ['black', 'red'], months: [6, 7],
    rainfall: [50, 160], temperature: [21, 35], yieldKgPerAcre: [800, 1400], costInrPerAcre: [25000, 45000],
    irrigationTypes: ['rainfed', 'borewell', 'canal'],
    groups: ['commercial', 'long-duration'],
  },
  groundnut: {
    emoji: '🥜', durationDays: [100, 125], water: 'Low to medium', waterScore: 1,
    soils: ['red', 'sandy', 'loamy'], months: [1, 2, 6, 7, 8],
    rainfall: [40, 140], temperature: [22, 32], yieldKgPerAcre: [600, 1000], costInrPerAcre: [22000, 40000],
    irrigationTypes: ['rainfed', 'borewell', 'drip'],
    groups: ['oilseed', 'short-duration'],
  },
  rice: {
    emoji: '🌾', durationDays: [120, 150], water: 'High', waterScore: 3,
    soils: ['clay', 'alluvial', 'loamy'], months: [6, 7, 8, 9, 10, 11],
    rainfall: [100, 300], temperature: [20, 34], yieldKgPerAcre: [1800, 2800], costInrPerAcre: [30000, 55000],
    irrigationTypes: ['canal', 'borewell'],
    groups: ['cereal', 'water-intensive'],
  },
  maize: {
    emoji: '🌽', durationDays: [90, 115], water: 'Medium', waterScore: 2,
    soils: ['red', 'black', 'loamy', 'alluvial'], months: [1, 2, 6, 7, 8, 9, 10, 11],
    rainfall: [50, 180], temperature: [18, 33], yieldKgPerAcre: [1800, 3000], costInrPerAcre: [22000, 40000],
    irrigationTypes: ['rainfed', 'borewell', 'canal'],
    groups: ['cereal', 'short-duration'],
  },
  ragi: {
    emoji: '🌾', durationDays: [100, 120], water: 'Low to medium', waterScore: 1,
    soils: ['red', 'loamy', 'sandy'], months: [6, 7, 8, 9],
    rainfall: [40, 120], temperature: [20, 32], yieldKgPerAcre: [800, 1400], costInrPerAcre: [18000, 32000],
    irrigationTypes: ['rainfed', 'borewell'],
    groups: ['cereal', 'millet', 'drought-tolerant'],
  },
  jowar: {
    emoji: '🌾', durationDays: [100, 130], water: 'Low to medium', waterScore: 1,
    soils: ['black', 'red', 'loamy'], months: [6, 7, 9, 10],
    rainfall: [35, 120], temperature: [22, 35], yieldKgPerAcre: [600, 1200], costInrPerAcre: [16000, 30000],
    irrigationTypes: ['rainfed', 'borewell'],
    groups: ['cereal', 'millet', 'drought-tolerant'],
  },
  bajra: {
    emoji: '🌾', durationDays: [75, 100], water: 'Low', waterScore: 1,
    soils: ['sandy', 'red', 'loamy'], months: [6, 7, 8],
    rainfall: [25, 100], temperature: [25, 35], yieldKgPerAcre: [500, 1000], costInrPerAcre: [14000, 26000],
    irrigationTypes: ['rainfed', 'borewell'],
    groups: ['cereal', 'millet', 'drought-tolerant', 'short-duration'],
  },
  'foxtail millet': {
    emoji: '🌾', durationDays: [80, 100], water: 'Low', waterScore: 1,
    soils: ['red', 'sandy', 'loamy'], months: [6, 7, 8, 9],
    rainfall: [30, 110], temperature: [20, 32], yieldKgPerAcre: [400, 800], costInrPerAcre: [14000, 26000],
    irrigationTypes: ['rainfed', 'borewell'],
    groups: ['cereal', 'millet', 'drought-tolerant', 'short-duration'],
  },
  'green gram': {
    emoji: '🫘', durationDays: [60, 80], water: 'Low', waterScore: 1,
    soils: ['red', 'sandy', 'loamy'], months: [1, 2, 6, 7, 8, 9],
    rainfall: [30, 100], temperature: [25, 35], yieldKgPerAcre: [250, 500], costInrPerAcre: [14000, 26000],
    irrigationTypes: ['rainfed', 'borewell', 'drip'],
    groups: ['pulse', 'short-duration', 'drought-tolerant'],
  },
  'black gram': {
    emoji: '🫘', durationDays: [70, 90], water: 'Low', waterScore: 1,
    soils: ['black', 'red', 'loamy'], months: [6, 7, 8, 9],
    rainfall: [35, 120], temperature: [25, 35], yieldKgPerAcre: [250, 500], costInrPerAcre: [14000, 26000],
    irrigationTypes: ['rainfed', 'borewell'],
    groups: ['pulse', 'short-duration'],
  },
  chickpea: {
    emoji: '🫘', durationDays: [100, 120], water: 'Low', waterScore: 1,
    soils: ['black', 'loamy', 'alluvial'], months: [10, 11, 12],
    rainfall: [20, 80], temperature: [15, 30], yieldKgPerAcre: [400, 800], costInrPerAcre: [18000, 32000],
    irrigationTypes: ['rainfed', 'borewell'],
    groups: ['pulse', 'rabi', 'drought-tolerant'],
  },
  'pigeon pea': {
    emoji: '🫘', durationDays: [150, 210], water: 'Low to medium', waterScore: 1,
    soils: ['black', 'red', 'loamy'], months: [6, 7],
    rainfall: [50, 150], temperature: [20, 35], yieldKgPerAcre: [300, 700], costInrPerAcre: [20000, 36000],
    irrigationTypes: ['rainfed', 'borewell'],
    groups: ['pulse', 'long-duration', 'drought-tolerant'],
  },
  'horse gram': {
    emoji: '🫘', durationDays: [90, 120], water: 'Low', waterScore: 1,
    soils: ['red', 'sandy', 'loamy'], months: [8, 9, 10],
    rainfall: [25, 100], temperature: [20, 32], yieldKgPerAcre: [250, 500], costInrPerAcre: [12000, 22000],
    irrigationTypes: ['rainfed', 'borewell'],
    groups: ['pulse', 'drought-tolerant'],
  },
  sunflower: {
    emoji: '🌻', durationDays: [85, 110], water: 'Low to medium', waterScore: 1,
    soils: ['black', 'red', 'loamy'], months: [1, 2, 6, 7, 8, 9],
    rainfall: [35, 120], temperature: [20, 32], yieldKgPerAcre: [400, 800], costInrPerAcre: [18000, 32000],
    irrigationTypes: ['rainfed', 'borewell', 'drip'],
    groups: ['oilseed', 'short-duration'],
  },
  sesame: {
    emoji: '🌱', durationDays: [80, 100], water: 'Low', waterScore: 1,
    soils: ['sandy', 'red', 'loamy'], months: [6, 7, 8, 9],
    rainfall: [25, 100], temperature: [25, 35], yieldKgPerAcre: [150, 350], costInrPerAcre: [14000, 26000],
    irrigationTypes: ['rainfed', 'borewell'],
    groups: ['oilseed', 'short-duration', 'drought-tolerant'],
  },
  wheat: {
    emoji: '🌾', durationDays: [110, 140], water: 'Medium', waterScore: 2,
    soils: ['loamy', 'alluvial', 'black'], months: [10, 11, 12],
    rainfall: [20, 100], temperature: [10, 25], yieldKgPerAcre: [800, 1400], costInrPerAcre: [22000, 38000],
    irrigationTypes: ['canal', 'borewell'],
    groups: ['cereal', 'rabi'],
  },
};

function getRegion(latitude, longitude) {
  if (latitude >= 11 && latitude <= 15.5 && longitude >= 73 && longitude <= 75) return 'Coastal Karnataka';
  if (latitude >= 14 && latitude <= 18.5 && longitude >= 74 && longitude <= 78.5) return 'North Karnataka';
  if (latitude >= 11 && latitude < 14 && longitude > 75.6 && longitude <= 79.5) return 'South Karnataka';
  return 'Nearby region';
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

function getCropCatalog() {
  return Object.keys(cropProfiles).sort().map((key, index) => ({
    id: index + 1,
    name: `${key[0].toLocaleUpperCase()}${key.slice(1)}`,
  }));
}

async function getCropPlan({ latitude, longitude, month, year, soilType = 'unknown', irrigation = 'rainfed', farmSizeAcres = 1, preferredCropIds = [] }) {
  const climate = await getClimateNormal({ latitude, longitude, month });
  const supportedCrops = getCropCatalog();

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
      irrigationTypes: profile.irrigationTypes,
      market: {
        unit: 'INR_PER_KG',
        latestPricePerKg: null,
        latestPriceDate: null,
        mandi: null,
        trend: [],
        finance: null,
      },
    };
  }).sort((a, b) => {
    const aPreferred = preferredCropIds.includes(a.cropId);
    const bPreferred = preferredCropIds.includes(b.cropId);
    return Number(bPreferred) - Number(aPreferred) || b.score - a.score;
  }).slice(0, 3);

  return {
    month,
    year,
    region: getRegion(latitude, longitude),
    farmSizeAcres,
    climate: {
      ...climate,
      source: 'Open-Meteo historical weather archive; monthly averages from completed years',
    },
    estimatesNote: 'Yield and cultivation-cost figures are generic planning ranges, not district-specific official forecasts. Crop, soil, and irrigation suitability is general guidance; validate it with your local KVK before planting. The crop planner does not include market estimates. Historical rainfall is a climate normal, not a six-month weather forecast.',
    recommendations,
  };
}

module.exports = { getCropCatalog, getCropPlan };
