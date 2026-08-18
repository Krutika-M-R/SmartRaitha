const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Calls the Flask prediction API (app.py in the ml/ folder).
async function getPredictedPrice({ cropId, mandiId, targetDate }) {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/predict`, {
      cropId,
      mandiId,
      targetDate,
    });
    return response.data;
  } catch (err) {
    if (err.response) {
      // Flask returned a proper error message - surface it as-is.
      throw new Error(err.response.data.error || 'Prediction service returned an error.');
    }
    throw new Error('Could not reach the prediction service. Is app.py running?');
  }
}

module.exports = { getPredictedPrice };
