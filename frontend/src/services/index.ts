/**
 * API Services Index
 * Central export point for all API modules
 */

export { apiClient } from './client';
export { authAPI } from './auth';
export { insuranceAPI } from './insurance';
export { caseAPI } from './cases';
export * from './notifications';

export * from './types';

// For backward compatibility, create a combined API object
import { authAPI } from './auth';
import { insuranceAPI } from './insurance';
import { caseAPI } from './cases';
import * as notificationsAPI from './notifications';

export const api = {
  auth: authAPI,
  insurance: insuranceAPI,
  cases: caseAPI,
  notifications: notificationsAPI,
};

export default api;
