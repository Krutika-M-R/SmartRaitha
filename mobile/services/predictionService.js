import request from './api';

// Forecasts prices from recent Agmarknet reports without using seeded prices.
async function generatePrediction(cropName, state, mandiNames, targetDate) {
  return request('/predictions/generate', {
    method: 'POST',
    auth: true,
    body: { cropName, state, mandiNames, targetDate },
  });
}

export default { generatePrediction };
