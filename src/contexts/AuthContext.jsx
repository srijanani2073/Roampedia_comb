import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

/**
 * Authentication Context Provider
 * Manages user authentication state and provides auth methods to all components
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050';

  /**
   * Setup axios defaults with auth token
   */
  const setupAxios = (token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('accessToken', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('accessToken');
    }
  };

  /**
   * Check if user is authenticated on mount
   */
  useEffect(() => {
    checkAuth();
  }, []);

  /**
   * Check authentication status
   */
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setLoading(false);
        return;
      }

      setupAxios(token);

      // Verify token is still valid
      const response = await axios.get(`${API_BASE_URL}/api/auth/me`);
      
      setUser(response.data.user);
      setLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      
      // Token expired or invalid - try to refresh
      await tryRefreshToken();
    }
  };

  /**
   * Try to refresh access token
   */
  const tryRefreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
        refreshToken,
      });

      const { accessToken } = response.data;
      setupAxios(accessToken);

      // Get user info with new token
      const userResponse = await axios.get(`${API_BASE_URL}/api/auth/me`);
      setUser(userResponse.data.user);
      setLoading(false);
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Refresh failed - user needs to log in again
      logout();
    }
  };

  /**
   * Register new user
   */
  const register = async (email, password, firstName, lastName, username) => {
    try {
      setError(null);
      setLoading(true);

      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        email,
        password,
        firstName,
        lastName,
        username
      });

      const { user, accessToken, refreshToken } = response.data;

      // Store tokens
      setupAxios(accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      setUser(user);
      setLoading(false);

      return { success: true, user };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  };

  /**
   * Login user
   */
  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);

      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password,
      });

      const { user, accessToken, refreshToken } = response.data;

      // Store tokens
      setupAxios(accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      setUser(user);
      setLoading(false);

      return { success: true, user };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        // Notify backend to invalidate token
        await axios.post(`${API_BASE_URL}/api/auth/logout`, {
          refreshToken,
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API call success
      setUser(null);
      setupAxios(null);
      localStorage.removeItem('refreshToken');
      setLoading(false);
    }
  };

  /**
   * Update user profile
   */
  const updateProfile = async (profileData) => {
    try {
      setError(null);

      const response = await axios.put(
        `${API_BASE_URL}/api/auth/profile`,
        profileData
      );

      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Update failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Change password
   */
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setError(null);

      const response = await axios.put(`${API_BASE_URL}/api/auth/password`, {
        currentPassword,
        newPassword,
      });

      const { accessToken, refreshToken } = response.data;

      // Update tokens
      setupAxios(accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Password change failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Delete account
   */
  const deleteAccount = async (password) => {
    try {
      setError(null);

      await axios.delete(`${API_BASE_URL}/api/auth/account`, {
        data: { password },
      });

      // Clear everything
      await logout();

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Account deletion failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Get user ID for API calls (returns actual user ID or "guest")
   */
  const getUserId = () => {
    return user?.id || 'guest';
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    updateProfile,
    changePassword,
    deleteAccount,
    getUserId,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use authentication context
 * Usage: const { user, login, logout } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

export default AuthContext;