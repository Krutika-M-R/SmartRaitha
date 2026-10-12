import request from './api';

async function getRecommendation(cropId, state) {
  const params = new URLSearchParams({
    cropId: String(cropId),
  });

  if (state) params.set('state', state);

  return request(`/recommendations?${params.toString()}`, { auth: true });
}

export default { getRecommendation };
