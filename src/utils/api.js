/**
 * API Utility - Axios Instances
 * 
 * This file creates separate axios instances for:
 * 1. Backend API calls (with authentication)
 * 2. External API calls (without authentication)
 * 
 * This prevents CORS issues and ensures proper authentication handling.
 */

import axios from 'axios';

// Base URL for your backend API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050';

/**
 * Axios instance for YOUR backend API calls
 * - Automatically adds Authorization header
 * - Handles token refresh on 401 errors
 * - Use this for all /api/* calls to your backend
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - adds auth token to backend requests
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - handles 401 errors and token refresh
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        
        // Redirect to home/login page
        window.location.href = '/';
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Axios instance for EXTERNAL API calls
 * - NO Authorization header (prevents CORS issues)
 * - Use this for calls to TimezoneDB, Wikipedia, exchange rates, etc.
 */
export const externalApiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  // No baseURL - each call will use full URL
});

/**
 * Helper function to check if user is authenticated
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('accessToken');
};

/**
 * Helper function to get current user ID
 * Returns null if not authenticated
 */
export const getUserId = () => {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    // Decode JWT to get user ID (without verification)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || null;
  } catch (error) {
    return null;
  }
};

// Export apiClient as default for convenience
export default apiClient;