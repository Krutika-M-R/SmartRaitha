import request from './api';

async function getPricesForCrop(cropId) {
  return request(`/prices?cropId=${cropId}`);
}

async function getLivePricesForCrop(commodity, state) {
  const params = new URLSearchParams({ commodity, state });
  const response = await request(`/prices/live?${params.toString()}`);
  return response.records || [];
}

async function getPriceHistory(cropId, mandiId, days = 30) {
  return request(`/prices/history?cropId=${cropId}&mandiId=${mandiId}&days=${days}`);
}

export default { getPricesForCrop, getLivePricesForCrop, getPriceHistory };
