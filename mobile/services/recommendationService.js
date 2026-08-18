import request from './api';

async function getRecommendation(cropId, quantityKg, latitude, longitude) {
  const params = new URLSearchParams({
    cropId: String(cropId),
    quantityKg: String(quantityKg),
  });

  if (latitude != null && longitude != null) {
    params.set('latitude', String(latitude));
    params.set('longitude', String(longitude));
  }

  return request(`/recommendations?${params.toString()}`, { auth: true });
}

export default { getRecommendation };
