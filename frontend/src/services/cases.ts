/**
 * Case Management API
 * Handles case CRUD operations and actions
 */

import apiClient from './client';
import { Case, CaseList, CaseCreateData, TimelineEvent, EmailTracking, Document, OmbudsmanStatus } from './types';

export const caseAPI = {
  /**
   * Create a new case
   */
  create: (data: CaseCreateData) =>
    apiClient.post<Case>('/cases/', data),

  /**
   * Get all cases for logged-in user
   */
  list: (params?: { status?: string; priority?: string; page?: number }) =>
    apiClient.get<CaseList[]>('/cases/', { params }),

  /**
   * Get single case with full details
   */
  get: (caseId: number) =>
    apiClient.get<Case>(`/cases/${caseId}/`),

  /**
   * Get comprehensive case status
   */
  getStatus: (caseId: number) =>
    apiClient.get(`/cases/${caseId}/status/`),

  /**
   * Update case status
   */
  updateStatus: (
    caseId: number,
    data: { new_status: string; notes?: string }
  ) => apiClient.post(`/cases/${caseId}/update_status/`, data),

  /**
   * Mark case as sent (draft -> submitted)
   */
  markAsSent: (caseId: number, notes?: string) =>
    apiClient.post(`/cases/${caseId}/mark_as_sent/`, { notes }),

  /**
   * Check for email replies
   */
  checkForReplies: (caseId: number) =>
    apiClient.post(`/cases/${caseId}/check_for_replies/`),

  /**
   * Get case timeline/audit trail
   */
  getTimeline: (caseId: number) =>
    apiClient.get<{ events: TimelineEvent[] }>(`/cases/${caseId}/timeline/`),

  /**
   * Get emails related to case
   */
  getEmails: (caseId: number) =>
    apiClient.get<{ emails: EmailTracking[] }>(`/cases/${caseId}/emails/`),

  /**
   * Get documents attached to case
   */
  getDocuments: (caseId: number) =>
    apiClient.get<{ documents: Document[] }>(`/cases/${caseId}/documents/`),

  /**
   * Upload document to case
   */
  uploadDocument: (caseId: number, formData: FormData) => {
    return apiClient.post(`/cases/${caseId}/documents/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Get ombudsman eligibility status
   */
  getOmbudsmanStatus: (caseId: number) =>
    apiClient.get<OmbudsmanStatus>(`/cases/${caseId}/ombudsman_eligibility/`),

  /**
   * Escalate case to ombudsman
   */
  escalateToOmbudsman: (caseId: number) =>
    apiClient.post(`/cases/${caseId}/escalate_to_ombudsman/`),
};
