import React, { createContext, useContext, useEffect, useState } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const loggedIn = await authService.isLoggedIn();
      if (loggedIn) {
        try {
          const me = await authService.getMe();
          setUser(me);
        } catch (e) {
          // token expired or invalid - treat as logged out
        }
      }
      setLoading(false);
    })();
  }, []);

  async function login(email, password) {
    const loggedInUser = await authService.login(email, password);
    setUser(loggedInUser);
  }

  async function verifyEmailCode(email, code) {
    return authService.verifyEmailCode(email, code);
  }

  async function googleLogin(idToken) {
    const loggedInUser = await authService.googleLogin(idToken);
    setUser(loggedInUser);
  }

  async function signup(name, email, password) {
    return authService.signup(name, email, password);
  }

  async function logout() {
    await authService.logout();
    setUser(null);
  }

  async function updateProfile(profile) {
    const updatedUser = await authService.updateProfile(profile);
    setUser(updatedUser);
    return updatedUser;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, verifyEmailCode, googleLogin, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
