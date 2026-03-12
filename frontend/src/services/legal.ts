import apiClient from './client';

export const legalAPI = {
  getTerms: () => apiClient.get('/legal/terms/'),
  getPrivacy: () => apiClient.get('/legal/privacy/'),
};
