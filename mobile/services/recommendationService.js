import request from './api';

async function getRecommendation(cropId, quantityKg) {
  return request(`/recommendations?cropId=${cropId}&quantityKg=${quantityKg}`, { auth: true });
}

export default { getRecommendation };
