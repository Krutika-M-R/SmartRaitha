import request from './api';

async function getCrops(state) {
  const params = new URLSearchParams();
  if (state) params.set('state', state);
  const query = params.toString();
  return request(`/crops${query ? `?${query}` : ''}`);
}

async function getCropCatalog() {
  return request('/crops/catalog');
}

export default { getCrops, getCropCatalog };
