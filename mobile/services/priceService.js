import request from './api';

async function getPricesForCrop(cropId) {
  return request(`/prices?cropId=${cropId}`);
}

async function getPriceHistory(cropId, mandiId, days = 30) {
  return request(`/prices/history?cropId=${cropId}&mandiId=${mandiId}&days=${days}`);
}

export default { getPricesForCrop, getPriceHistory };
