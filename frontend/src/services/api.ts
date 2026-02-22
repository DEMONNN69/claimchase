/**
 * API Service for AmicusClaims (Legacy)
 * This file maintained for backward compatibility
 * Use individual service files for new code
 */

// Re-export everything from new structure
export { apiClient } from './client';
export { authAPI } from './auth';
export { insuranceAPI } from './insurance';
export { caseAPI } from './cases';
export * from './types';

// Default export
import api from './index';
export default api;
