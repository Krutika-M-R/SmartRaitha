const axios = require('axios');

const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

function getCropAdvice() {
  const month = new Date().getMonth() + 1;
  if (month >= 6 && month <= 9) {
    return { crop: 'Rice', window: 'June - September', reason: 'Monsoon season supports water-loving crops.' };
  }
  if (month >= 10 && month <= 12) {
    return { crop: 'Onion', window: 'October - December', reason: 'Cooler weather is suitable for onion growth.' };
  }
  if (month >= 1 && month <= 2) {
    return { crop: 'Tomato', window: 'January - February', reason: 'Mild temperatures support tomato flowering.' };
  }
  return { crop: 'Groundnut', window: 'March - May', reason: 'Warm soil and moderate moisture suit groundnut.' };
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
    seasonalAdvice: getCropAdvice(),
    futureAdvice: getFutureCropAdvice(response.data.daily),
  };
}

module.exports = { getFarmGuidance };
