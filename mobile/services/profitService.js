import request from './api';

async function calculateProfit(cropName, state, mandiName, quantityKg, location) {
  return request('/profit/calculate', {
    method: 'POST',
    auth: true,
    body: {
      cropName,
      state,
      mandiName,
      quantityKg,
      originLatitude: location.latitude,
      originLongitude: location.longitude,
    },
  });
}

export default { calculateProfit };
