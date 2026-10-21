import request from './api';

async function getPlan({ location, month, year, soilType, irrigation, farmSizeAcres, preferredCropIds }) {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    month: String(month),
    year: String(year),
    soilType,
    irrigation,
    farmSizeAcres: String(farmSizeAcres),
    preferredCropIds: preferredCropIds.join(','),
  });
  return request(`/farm-guidance/planner?${params.toString()}`, { auth: true });
}

export default { getPlan };
