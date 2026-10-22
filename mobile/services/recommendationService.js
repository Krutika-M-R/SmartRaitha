import request from './api';

async function getRecommendation(cropName, state, location, quantityKg = 100, transportDetails = {}) {
  const params = new URLSearchParams({ cropName, state });
  if (location?.district) params.set('district', location.district);
  if (Number.isFinite(location?.latitude)) params.set('latitude', String(location.latitude));
  if (Number.isFinite(location?.longitude)) params.set('longitude', String(location.longitude));
  params.set('quantityKg', String(quantityKg));
  Object.entries(transportDetails).forEach(([key, value]) => {
    params.set(key, String(value));
  });

  return request(`/recommendations?${params.toString()}`, { auth: true });
}

export default { getRecommendation };
