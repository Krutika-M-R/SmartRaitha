import request from './api';

async function getCurrentWeather(latitude, longitude) {
  return request(`/farm-guidance?latitude=${latitude}&longitude=${longitude}`, { auth: true });
}

export default { getCurrentWeather };
