const axios = require('axios');

const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

function getIndiaMonthYear() {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(new Date());
  return {
    month: Number(parts.find((part) => part.type === 'month').value),
    year: Number(parts.find((part) => part.type === 'year').value),
  };
}

function getRegionalCrop(latitude, longitude, month) {
  const isCoastalKarnataka = latitude >= 11 && latitude <= 15.5 && longitude >= 73 && longitude <= 75;
  const isNorthKarnataka = latitude >= 14 && latitude <= 18.5 && longitude >= 74 && longitude <= 78.5;
  const isSouthKarnataka = latitude >= 11 && latitude < 14 && longitude > 75.6 && longitude <= 79.5;
  const isMonsoon = month >= 6 && month <= 9;
  const isPostMonsoon = month === 10 || month === 11 || month === 12 || month === 1;

  if (isCoastalKarnataka) {
    if (isMonsoon) return { crop: 'Rice', region: 'Coastal Karnataka', reason: 'Monsoon rainfall supports paddy in suitable lowland fields.' };
    if (isPostMonsoon) return { crop: 'Black gram', region: 'Coastal Karnataka', reason: 'Post-monsoon residual moisture can support short-duration pulses.' };
    return { crop: 'Groundnut', region: 'Coastal Karnataka', reason: 'Groundnut can suit the warmer months where drainage and irrigation are adequate.' };
  }

  if (isNorthKarnataka) {
    if (isMonsoon) return { crop: 'Maize', region: 'North Karnataka drylands', reason: 'Maize is a common monsoon crop for suitable rain-fed fields.' };
    if (isPostMonsoon) return { crop: 'Chickpea', region: 'North Karnataka drylands', reason: 'Chickpea is suited to the post-monsoon rabi season where soil moisture is adequate.' };
    return { crop: 'Sesame', region: 'North Karnataka drylands', reason: 'Sesame can suit the warm, relatively dry season with timely sowing.' };
  }

  if (isSouthKarnataka) {
    if (isMonsoon) return { crop: 'Finger millet (ragi)', region: 'South Karnataka plateau', reason: 'Ragi is well suited to the monsoon season in many rain-fed plateau areas.' };
    if (isPostMonsoon) return { crop: 'Horse gram', region: 'South Karnataka plateau', reason: 'Horse gram is a hardy pulse suited to post-monsoon residual moisture.' };
    return { crop: 'Green gram', region: 'South Karnataka plateau', reason: 'Green gram can be grown in the warmer months where irrigation is available.' };
  }

  if (isMonsoon) return { crop: 'Maize', region: 'Nearby inland region', reason: 'Maize can suit the monsoon season in suitable well-drained fields.' };
  if (isPostMonsoon) return { crop: 'Chickpea', region: 'Nearby inland region', reason: 'Chickpea is a common post-monsoon pulse where the local climate and soil are suitable.' };
  return { crop: 'Green gram', region: 'Nearby inland region', reason: 'Green gram can suit the warmer season where water is available.' };
}

function getSeasonalCropAdvice({ latitude, longitude, month, year }) {
  const recommendation = getRegionalCrop(latitude, longitude, month);
  const window = new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  return { ...recommendation, window, month, year };
}

function getFutureCropAdvice(daily) {
  if (!daily?.time?.length) return null;
  const averageMax = daily.temperature_2m_max.reduce((sum, value) => sum + value, 0) / daily.time.length;
  const averageRainChance = Math.max(...daily.precipitation_probability_max);
  if (averageRainChance >= 65) {
    return { crop: 'Rice', note: 'Plan water-loving crops and avoid spraying before rainy days.' };
  }
  if (averageMax >= 30) {
    return { crop: 'Groundnut', note: 'Warm conditions suit groundnut; prepare well-drained soil.' };
  }
  return { crop: 'Tomato', note: 'Mild conditions suit tomato; plan staking and regular watering.' };
}

async function getFarmGuidance({ latitude, longitude }) {
  const { month, year } = getIndiaMonthYear();
  const response = await axios.get(WEATHER_URL, {
    params: {
      latitude,
      longitude,
      current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
      forecast_days: 7,
      timezone: 'auto',
    },
  });

  return {
    latitude,
    longitude,
    current: response.data.current,
    daily: response.data.daily,
    seasonalAdvice: getSeasonalCropAdvice({ latitude, longitude, month, year }),
    futureAdvice: getFutureCropAdvice(response.data.daily),
  };
}

module.exports = { getFarmGuidance, getIndiaMonthYear, getSeasonalCropAdvice };
