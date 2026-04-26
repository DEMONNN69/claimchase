/**
 * API Client Configuration
 * Axios instance — auth via httpOnly cookies, no token in localStorage
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

const developmentBaseURL = import.meta.env.DEV ? 'http://localhost:8000' : undefined;

export const apiClient: AxiosInstance = axios.create({
  baseURL: developmentBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // send cookies on every request
});

// Request interceptor - prepend /api to relative URLs
apiClient.interceptors.request.use((config) => {
  if (config.url && !config.url.startsWith('http') && !config.url.startsWith('/api')) {
    config.url = '/api' + (config.url.startsWith('/') ? config.url : '/' + config.url);
  }
  return config;
});

// Response interceptor - Auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: () => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => apiClient(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(
          (developmentBaseURL || '') + '/api/auth/token/refresh/',
          {},
          { withCredentials: true }
        );
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
