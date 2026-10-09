import AsyncStorage from '@react-native-async-storage/async-storage';
import request from './api';

async function signup(name, email, password) {
  const data = await request('/auth/signup', {
    method: 'POST',
    body: { name: name.trim(), email: email.trim().toLowerCase(), password },
  });
  return data;
}

async function verifyEmailCode(email, code) {
  return request('/auth/verify-code', {
    method: 'POST',
    body: { email: email.trim().toLowerCase(), code: code.trim() },
  });
}

async function googleLogin(idToken) {
  const data = await request('/auth/google', { method: 'POST', body: { idToken } });
  await AsyncStorage.setItem('token', data.token);
  return data.user;
}

async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: { email: email.trim().toLowerCase(), password },
  });
  await AsyncStorage.setItem('token', data.token);
  return data.user;
}

async function logout() {
  await AsyncStorage.removeItem('token');
}

async function getMe() {
  return request('/auth/me', { auth: true });
}

async function updateProfile(profile) {
  return request('/auth/profile', { method: 'PUT', auth: true, body: profile });
}

async function isLoggedIn() {
  const token = await AsyncStorage.getItem('token');
  return !!token;
}

export default { signup, verifyEmailCode, googleLogin, login, logout, getMe, updateProfile, isLoggedIn };
