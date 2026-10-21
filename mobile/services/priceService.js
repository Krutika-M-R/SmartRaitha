import request from './api';

async function getPricesForCrop(cropName, state) {
  const params = new URLSearchParams({ cropName, state });
  return request(`/prices?${params.toString()}`);
}

async function getLivePricesForCrop(commodity, state) {
  const params = new URLSearchParams({ commodity, state });
  const response = await request(`/prices/live?${params.toString()}`);
  return {
    records: response.records || [],
    marketScope: response.marketScope || 'state',
    pricedCount: response.pricedCount || 0,
    liveCount: response.liveCount || 0,
  };
}

async function getPriceHistory(cropName, state, mandiName, days = 30) {
  const params = new URLSearchParams({ cropName, state, days: String(days) });
  if (mandiName) params.set('mandiName', mandiName);
  return request(`/prices/history?${params.toString()}`);
}

export default { getPricesForCrop, getLivePricesForCrop, getPriceHistory };
