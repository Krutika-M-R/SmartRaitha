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

  async function signup(name, email, password) {
    const newUser = await authService.signup(name, email, password);
    setUser(newUser);
  }

  async function logout() {
    await authService.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
