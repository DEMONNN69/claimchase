/**
 * Case Management API
 * Handles case CRUD operations and actions
 */

import apiClient from './client';
import { Case, CaseList, CaseCreateData, TimelineEvent, EmailTracking, Document, OmbudsmanStatus, EmailSendResponse, EmailSendRequest } from './types';

export interface AdminDecisionStatus {
  success: boolean;
  has_manual_entry: boolean;
  message?: string;
  data?: {
    admin_decision: 'pending' | 'claim_accepted' | 'claim_rejected';
    admin_decision_display: string;
    admin_decision_notes: string;
    admin_decision_at: string | null;
    admin_decision_by: string | null;
    manual_entry_submitted_at: string;
    reply_body_preview: string | null;
  };
}

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

  /**
   * Send email for case via Gmail
   */
  sendEmail: (
    caseId: number,
    data: EmailSendRequest
  ) => apiClient.post<EmailSendResponse>(`/cases/${caseId}/send_email/`, data),

  /**
   * Submit manually entered email reply
   */
  submitManualReply: (caseId: number, replyBody: string) =>
    apiClient.post(`/cases/${caseId}/submit_manual_reply/`, { reply_body: replyBody }),

  /**
   * Report false email notification
   */
  reportFalseNotification: (caseId: number, notificationId: number, reason?: string) =>
    apiClient.post(`/cases/${caseId}/report_false_notification/`, {
      notification_id: notificationId,
      reason,
    }),

  /**
   * Get admin decision status for manual reply
   */
  getAdminDecisionStatus: (caseId: number) =>
    apiClient.get<AdminDecisionStatus>(`/cases/${caseId}/admin_decision_status/`),

  /**
   * Get ombudsman guide progress
   */
  getOmbudsmanGuideProgress: (caseId: number) =>
    apiClient.get(`/cases/${caseId}/ombudsman_guide_progress/`),

  /**
   * Update ombudsman guide progress
   */
  updateOmbudsmanGuideProgress: (
    caseId: number,
    currentStep: number,
    completedSteps: number[],
    isCompleted: boolean
  ) =>
    apiClient.post(`/cases/${caseId}/ombudsman_guide_progress/`, {
      current_step: currentStep,
      completed_steps: completedSteps,
      is_completed: isCompleted,
    }),
};
