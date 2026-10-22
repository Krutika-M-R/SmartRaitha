export function getMarketDistanceKm(location, mandi) {
  if (!Number.isFinite(location?.latitude) || !Number.isFinite(location?.longitude)
    || !Number.isFinite(mandi?.latitude) || !Number.isFinite(mandi?.longitude)) {
    return null;
  }

  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(mandi.latitude - location.latitude);
  const longitudeDelta = toRadians(mandi.longitude - location.longitude);
  const originLatitude = toRadians(location.latitude);
  const destinationLatitude = toRadians(mandi.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(originLatitude) * Math.cos(destinationLatitude)
    * Math.sin(longitudeDelta / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}
