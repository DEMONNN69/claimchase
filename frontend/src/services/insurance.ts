/**
 * Insurance Company API
 * Handles fetching insurance company data
 */

import apiClient from './client';
import { InsuranceCompany } from './types';

export const insuranceAPI = {
  /**
   * Get all insurance companies
   */
  list: (params?: { category?: string; search?: string }) =>
    apiClient.get<InsuranceCompany[]>('/insurance-companies/', { params }),

  /**
   * Get single insurance company
   */
  get: (id: number) =>
    apiClient.get<InsuranceCompany>(`/insurance-companies/${id}/`),

  /**
   * Get companies by category
   */
  getByCategory: (category: 'life' | 'health' | 'general') =>
    apiClient.get<InsuranceCompany[]>('/insurance-companies/', {
      params: { category },
    }),

  /**
   * Get available insurance types
   */
  getInsuranceTypes: () =>
    apiClient.get('/insurance-types/'),
};
