import AsyncStorage from '@react-native-async-storage/async-storage';

// Change this to your backend's address.
// - Android emulator: http://10.0.2.2:5000/api
// - Physical phone with Expo Go: http://<your-laptop-LAN-IP>:5000/api
export const BASE_URL = 'http://192.168.0.247:5000/api';

async function getToken() {
  return AsyncStorage.getItem('token');
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }

  return data;
}

export default request;
