const DEFAULT_MANDI_RADIUS_KM = 80;
const MAX_MANDI_RADIUS_KM = 100;

function getDistanceKm(originLatitude, originLongitude, destination) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(destination.latitude - originLatitude);
  const longitudeDelta = toRadians(destination.longitude - originLongitude);
  const originLatRadians = toRadians(originLatitude);
  const destinationLatRadians = toRadians(destination.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(originLatRadians) * Math.cos(destinationLatRadians)
    * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

module.exports = { DEFAULT_MANDI_RADIUS_KM, MAX_MANDI_RADIUS_KM, getDistanceKm };
