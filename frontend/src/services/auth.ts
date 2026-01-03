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
    username: string;
    password: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
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
};
