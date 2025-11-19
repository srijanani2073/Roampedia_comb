import React, { createContext, useState, useContext, useEffect } from 'react';
import apiClient from '../utils/api';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050';

  /** Store access token */
  const setupToken = (token) => {
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  /** 🔍 Check current authentication status */
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Check who user is — apiClient attaches Authorization header
      const response = await apiClient.get('/api/auth/me');

      setUser(response.data.user);
      setLoading(false);
    } catch (error) {
      console.warn("Auth check failed:", error?.response?.status);

      // NO TOKEN? → do nothing
      const stored = localStorage.getItem('accessToken');
      if (!stored) {
        setLoading(false);
        return;
      }

      // If token failed, try refreshing
      await safeRefreshFlow();
    }
  };

  /** 🔁 Safe refresh flow — without infinite logout & popup */
  const safeRefreshFlow = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Try refreshing token
      const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
        refreshToken,
      });

      const { accessToken } = response.data;
      setupToken(accessToken);

      // With new token, fetch user
      const userRes = await apiClient.get('/api/auth/me');
      setUser(userRes.data.user);

    } catch (err) {
      console.warn("Refresh failed — staying logged out until manual login:", err);

      // Allow UI to show login button instead of popup loop
      setUser(null);
    }

    setLoading(false);
  };

  /** 🟢 Register */
  const register = async (email, password, firstName, lastName) => {
    try {
      setError(null);
      setLoading(true);

      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        email,
        password,
        firstName,
        lastName,
      });

      const { user, accessToken, refreshToken } = response.data;

      setupToken(accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      setUser(user);

      // Ensure backend validates token
      await checkAuth();

      setLoading(false);
      return { success: true, user };

    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  };

  /** 🟢 Login */
  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);

      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password,
      });

      const { user, accessToken, refreshToken } = response.data;

      setupToken(accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      setUser(user);

      // ENSURE API CLIENT SEES TOKEN BEFORE Dashboard loads
      await checkAuth();

      setLoading(false);
      return { success: true, user };

    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  };

  /** 🔴 Logout */
  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        await apiClient.post('/api/auth/logout', { refreshToken });
      }
    } catch (err) {
      console.error('Logout error:', err);
    }

    // Always clear local tokens + user
    setUser(null);
    setupToken(null);
    localStorage.removeItem('refreshToken');
  };

  /** 📝 Edit profile */
  const updateProfile = async (profileData) => {
    try {
      setError(null);

      const response = await apiClient.put('/api/auth/profile', profileData);
      setUser(response.data.user);

      return { success: true, user: response.data.user };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Update failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /** 🔐 Change Password */
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setError(null);

      const response = await apiClient.put('/api/auth/password', {
        currentPassword,
        newPassword,
      });

      const { accessToken, refreshToken } = response.data;

      setupToken(accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      return { success: true };

    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Password update failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /** Delete account */
  const deleteAccount = async (password) => {
    try {
      setError(null);

      await apiClient.delete('/api/auth/account', {
        data: { password },
      });

      await logout();
      return { success: true };

    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Delete failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const getUserId = () => user?.id || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        deleteAccount,
        getUserId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export default AuthContext;
