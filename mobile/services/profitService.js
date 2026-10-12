import request from './api';

async function calculateProfit(cropId, mandiId, quantityKg) {
  return request('/profit/calculate', {
    method: 'POST',
    auth: true,
    body: { cropId, mandiId, quantityKg },
  });
}

export default { calculateProfit };
