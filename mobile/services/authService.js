import AsyncStorage from '@react-native-async-storage/async-storage';
import request from './api';

async function signup(name, email, password) {
  const data = await request('/auth/signup', { method: 'POST', body: { name, email, password } });
  await AsyncStorage.setItem('token', data.token);
  return data.user;
}

async function login(email, password) {
  const data = await request('/auth/login', { method: 'POST', body: { email, password } });
  await AsyncStorage.setItem('token', data.token);
  return data.user;
}

async function logout() {
  await AsyncStorage.removeItem('token');
}

async function getMe() {
  return request('/auth/me', { auth: true });
}

async function isLoggedIn() {
  const token = await AsyncStorage.getItem('token');
  return !!token;
}

export default { signup, login, logout, getMe, isLoggedIn };
