import request from './api';

async function getLatestPrediction(cropId, mandiId) {
  return request(`/predictions?cropId=${cropId}&mandiId=${mandiId}`);
}

// Asks the backend to run the ML model for a future date and store the result.
async function generatePrediction(cropId, mandiId, targetDate) {
  return request('/predictions/generate', {
    method: 'POST',
    auth: true,
    body: { cropId, mandiId, targetDate },
  });
}

export default { getLatestPrediction, generatePrediction };
