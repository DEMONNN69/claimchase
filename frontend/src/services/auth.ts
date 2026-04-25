/**
 * Authentication API
 * Handles login, signup, logout, and profile
 */

import apiClient from './client';
import { User } from './types';

export const authAPI = {
  /**
   * Sign up - Create new account
   */
  signup: (data: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    terms_accepted?: boolean;
  }) => apiClient.post('/auth/signup/', data),

  /**
   * Login - Get authentication token
   */
  login: (email: string, password: string) =>
    apiClient.post('/auth/login/', { email, password }),

  /**
   * Get current user profile
   */
  getProfile: () => apiClient.get<User>('/auth/profile/'),

  /**
   * Logout - Delete authentication token
   */
  logout: () => apiClient.post('/auth/logout/'),

  /**
   * Update user profile
   */
  updateProfile: (data: Partial<User>) =>
    apiClient.put('/auth/profile/', data),

  /**
   * Refresh access token using refresh token
   */
  refreshToken: (refresh: string) =>
    apiClient.post('/auth/token/refresh/', { refresh }),

  /**
   * Get Google OAuth consent URL
   */
  googleConnect: () => apiClient.get<{ authorization_url: string }>('/auth/google/connect/'),

  /**
   * Exchange Google auth code for a ClaimChase token
   */
  googleCallback: (code: string) =>
    apiClient.post('/auth/google/callback/', { code }),
};
