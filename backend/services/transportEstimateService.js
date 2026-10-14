const axios = require('axios');

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving';
const TRANSPORT_RATE_PER_KM = 7;

function getDestinationSearchQueries(destination) {
  const normalizedDestination = destination.toLocaleLowerCase().replace(/\s+/g, ' ').trim();

  if (/\b(bengaluru|bangalore)\b/.test(normalizedDestination)) {
    return [
      'Yeshwanthpur APMC Market, Bengaluru, Karnataka, India',
      'Bengaluru, Karnataka, India',
    ];
  }
  if (/\b(ballari|bellary)\b/.test(normalizedDestination)) {
    return ['APMC Road, Ballari, Karnataka, India', 'Ballari, Karnataka, India'];
  }
  if (/\b(laxmeshwar|lakshmeshwar)\b/.test(normalizedDestination)) {
    return ['Lakshmeshwar, Karnataka, India'];
  }

  const simplifiedDestination = destination
    .replace(/\b(?:APMC|market yard)\b/gi, '')
    .replace(/[,\s]+/g, ' ')
    .trim();
  return [...new Set([destination, simplifiedDestination])].filter(Boolean);
}

async function geocodeDestination(destination) {
  for (const query of getDestinationSearchQueries(destination)) {
    let response;
    try {
      response = await axios.get(NOMINATIM_SEARCH_URL, {
        params: { q: query, format: 'jsonv2', limit: 1, countrycodes: 'in' },
        headers: { 'User-Agent': 'SmartRaitha/1.0' },
        timeout: 15000,
      });
    } catch (error) {
      const status = error.response?.status;
      throw new Error(status
        ? `Mandi location lookup failed with HTTP ${status}.`
        : 'Mandi location lookup failed due to a network error or timeout.');
    }

    const location = response.data?.[0];
    const latitude = Number(location?.lat);
    const longitude = Number(location?.lon);
    if (location && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
      && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180) {
      return { latitude, longitude };
    }
  }

  throw new Error(`Could not find valid map coordinates for ${destination}.`);
}

async function estimateTransportation({
  originLatitude,
  originLongitude,
  destination,
  destinationCoordinates,
}) {
  const hasLatitude = originLatitude !== null && originLatitude !== undefined && String(originLatitude).trim() !== '';
  const hasLongitude = originLongitude !== null && originLongitude !== undefined && String(originLongitude).trim() !== '';
  const latitude = Number(originLatitude);
  const longitude = Number(originLongitude);
  if (!hasLatitude || !Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !hasLongitude || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('A valid origin latitude and longitude are required for transportation estimates.');
  }
  if (!destination || !destination.trim()) {
    throw new Error('A destination mandi is required for transportation estimates.');
  }

  let resolvedDestinationCoordinates = destinationCoordinates;
  if (resolvedDestinationCoordinates !== undefined && resolvedDestinationCoordinates !== null) {
    const destinationLat = Number(resolvedDestinationCoordinates.latitude);
    const destinationLon = Number(resolvedDestinationCoordinates.longitude);
    if (!Number.isFinite(destinationLat) || destinationLat < -90 || destinationLat > 90
      || !Number.isFinite(destinationLon) || destinationLon < -180 || destinationLon > 180) {
      throw new Error('A valid destination latitude and longitude are required for transportation estimates.');
    }
    resolvedDestinationCoordinates = {
      latitude: destinationLat,
      longitude: destinationLon,
    };
  } else {
    resolvedDestinationCoordinates = await geocodeDestination(destination.trim());
  }
  let response;
  try {
    response = await axios.get(
      `${OSRM_ROUTE_URL}/${longitude},${latitude};${resolvedDestinationCoordinates.longitude},${resolvedDestinationCoordinates.latitude}`,
      {
        params: {
          overview: 'full',
          geometries: 'geojson',
          steps: false,
        },
        timeout: 15000,
      },
    );
  } catch (error) {
    const status = error.response?.status;
    throw new Error(status
      ? `OSRM route request failed with HTTP ${status}.`
      : 'OSRM route request failed due to a network error or timeout.');
  }

  const route = response.data?.routes?.[0];
  const distanceMeters = route?.distance;
  if (response.data?.code === 'NoRoute') {
    throw new Error(`OSRM could not find a driving route to ${destination}.`);
  }
  if (response.data?.code !== 'Ok') {
    throw new Error(`OSRM route lookup returned ${response.data?.code || 'an unknown status'}: ${response.data?.message || 'No route details were returned.'}`);
  }
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    throw new Error(`OSRM returned an invalid driving distance for ${destination}.`);
  }

  const routeCoordinates = route.geometry?.coordinates;
  if (!Array.isArray(routeCoordinates) || routeCoordinates.length < 2
    || routeCoordinates.some((coordinate) => !Array.isArray(coordinate)
      || !Number.isFinite(coordinate[0]) || !Number.isFinite(coordinate[1])
      || coordinate[0] < -180 || coordinate[0] > 180
      || coordinate[1] < -90 || coordinate[1] > 90)) {
    throw new Error(`OSRM route response for ${destination} is missing valid route geometry.`);
  }

  const distanceKm = distanceMeters / 1000;
  return {
    distanceKm: Number(distanceKm.toFixed(1)),
    ratePerKm: TRANSPORT_RATE_PER_KM,
    transportationCost: Number((distanceKm * TRANSPORT_RATE_PER_KM).toFixed(2)),
    routeCoordinates: routeCoordinates.map(([routeLongitude, routeLatitude]) => ({
      latitude: routeLatitude,
      longitude: routeLongitude,
    })),
    originCoordinates: {
      latitude: routeCoordinates[0][1],
      longitude: routeCoordinates[0][0],
    },
    destinationCoordinates: {
      latitude: routeCoordinates[routeCoordinates.length - 1][1],
      longitude: routeCoordinates[routeCoordinates.length - 1][0],
    },
  };
}

module.exports = { estimateTransportation, TRANSPORT_RATE_PER_KM };
