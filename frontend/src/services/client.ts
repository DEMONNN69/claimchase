/**
 * API Client Configuration
 * Axios instance with authentication and error handling
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

const developmentBaseURL = import.meta.env.DEV ? 'http://localhost:8000' : undefined;

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: developmentBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - Add token to all requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  // Prepend /api to relative URLs that don't already have it
  if (config.url && !config.url.startsWith('http') && !config.url.startsWith('/api')) {
    config.url = '/api' + (config.url.startsWith('/') ? config.url : '/' + config.url);
  }
  return config;
});

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // If 401, clear token and redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
